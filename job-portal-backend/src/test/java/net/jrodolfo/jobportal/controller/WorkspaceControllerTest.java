package net.jrodolfo.jobportal.controller;
import com.fasterxml.jackson.databind.ObjectMapper;
import net.jrodolfo.jobportal.constant.*;
import net.jrodolfo.jobportal.model.*;
import net.jrodolfo.jobportal.repository.*;
import net.jrodolfo.jobportal.service.SkillMatchingService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class WorkspaceControllerTest {
 @Autowired MockMvc mvc;
 @Autowired ObjectMapper json;
 @Autowired UserRepository users;
 @Autowired JobRepository jobs;
 @Autowired CompanyRepository companies;
 @Autowired ApplicationRepository applications;
 @Autowired SkillMatchingService matching;
 @Autowired org.springframework.security.crypto.password.PasswordEncoder passwords;
 User candidate;
 Job job;
 Application application;
 @BeforeEach void setup() {
  candidate=users.findByEmailIgnoreCase("user@local.test").orElseThrow();
  var r=users.save(new User("Recruiter","recruiter@test.test",passwords.encode("password123"),AuthProvider.LOCAL,Role.RECRUITER));
  var other=users.save(new User("Other recruiter","other@test.test",passwords.encode("password123"),AuthProvider.LOCAL,Role.RECRUITER));
  var c=new Company(); c.setName("Test company"); c.setOwnerId(r.getId()); c=companies.save(c);
  var d=new Company(); d.setName("Other company"); d.setOwnerId(other.getId()); companies.save(d);
  job=new Job("Java developer","Build APIs","Test company"); job.setCompanyId(c.getId()); job.setRequiredSkills("Java, Spring Boot, React"); job=jobs.save(job);
  application=applications.save(new Application(candidate,job));
 }
 @Test void profileCvAndPasswordsAreProtected() throws Exception {
  mvc.perform(put("/api/workspace/profile").with(httpBasic("user@local.test","user123")).contentType(MediaType.APPLICATION_JSON)
    .content("{\"portfolioUrl\":\"github.com/example\"}")).andExpect(status().isBadRequest());
  mvc.perform(put("/api/workspace/profile").with(httpBasic("user@local.test","user123")).contentType(MediaType.APPLICATION_JSON)
    .content(json.writeValueAsString(Map.of("headline","Graduate","skills","Java, React","portfolioUrl","https://github.com/example"))))
    .andExpect(status().isOk()).andExpect(jsonPath("$.skills").value("Java, React"));
  mvc.perform(get("/api/workspace/profiles/"+candidate.getId()).with(httpBasic("other@test.test","password123"))).andExpect(status().isForbidden());
  mvc.perform(get("/api/workspace/profiles/"+candidate.getId()).with(httpBasic("recruiter@test.test","password123"))).andExpect(status().isOk());
  mvc.perform(multipart("/api/workspace/profile/cv").file(new MockMultipartFile("file","cv.pdf","application/pdf","%PDF-1.7 test".getBytes()))
    .with(httpBasic("user@local.test","user123"))).andExpect(status().isOk()).andExpect(jsonPath("$.cvData").doesNotExist());
  mvc.perform(get("/api/workspace/profiles/"+candidate.getId()+"/cv").with(httpBasic("other@test.test","password123"))).andExpect(status().isForbidden());
  mvc.perform(get("/api/workspace/profiles/"+candidate.getId()+"/cv").with(httpBasic("recruiter@test.test","password123"))).andExpect(status().isOk()).andExpect(content().contentType(MediaType.APPLICATION_PDF));
  mvc.perform(get("/api/workspace/applications").with(httpBasic("recruiter@test.test","password123"))).andExpect(status().isOk()).andExpect(jsonPath("$[0].user.password").doesNotExist());
 }
 @Test void companyProvisioningAndJobOwnership() throws Exception {
  String body=json.writeValueAsString(Map.of("name","New company","recruiterName","New recruiter","recruiterEmail","new@test.test","password","password123"));
  mvc.perform(post("/api/workspace/companies").with(httpBasic("user@local.test","user123")).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
  mvc.perform(post("/api/workspace/companies").with(httpBasic("admin@local.test","admin123")).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
  assertEquals(Role.RECRUITER,users.findByEmailIgnoreCase("new@test.test").orElseThrow().getRole());
  mvc.perform(get("/api/workspace/jobs").with(httpBasic("other@test.test","password123"))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
  mvc.perform(put("/api/workspace/jobs/"+job.getId()).with(httpBasic("other@test.test","password123")).contentType(MediaType.APPLICATION_JSON)
   .content("{\"title\":\"Hijack\",\"description\":\"No\"}")).andExpect(status().isForbidden());
 }
 @Test void stageHistoryAnalyticsAndMessagesAreScoped() throws Exception {
  String url="/api/workspace/applications/"+application.getId();
  mvc.perform(put(url+"/stage").with(httpBasic("other@test.test","password123")).contentType(MediaType.APPLICATION_JSON).content("{\"stage\":\"HIRED\"}")).andExpect(status().isForbidden());
  mvc.perform(put(url+"/stage").with(httpBasic("user@local.test","user123")).contentType(MediaType.APPLICATION_JSON).content("{\"stage\":\"HIRED\"}")).andExpect(status().isForbidden());
  mvc.perform(put(url+"/stage").with(httpBasic("recruiter@test.test","password123")).contentType(MediaType.APPLICATION_JSON).content("{\"stage\":\"HIRED\"}")).andExpect(status().isOk());
  mvc.perform(get(url+"/history").with(httpBasic("user@local.test","user123"))).andExpect(status().isOk()).andExpect(jsonPath("$[0].stage").value("HIRED"));
  mvc.perform(get("/api/workspace/analytics").with(httpBasic("recruiter@test.test","password123"))).andExpect(status().isOk()).andExpect(jsonPath("$.hires").value(1));
  mvc.perform(get("/api/workspace/analytics").with(httpBasic("other@test.test","password123"))).andExpect(status().isOk()).andExpect(jsonPath("$.applications").value(0));
  mvc.perform(post(url+"/messages").with(httpBasic("recruiter@test.test","password123")).contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"Welcome to the interview\"}")).andExpect(status().isOk());
  mvc.perform(get(url+"/messages").with(httpBasic("user@local.test","user123"))).andExpect(status().isOk()).andExpect(jsonPath("$[0].body").value("Welcome to the interview"));
  mvc.perform(get(url+"/messages").with(httpBasic("other@test.test","password123"))).andExpect(status().isForbidden());
  mvc.perform(post(url+"/messages").with(httpBasic("user@local.test","user123")).contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"Thanks, confirmed\"}")).andExpect(status().isOk());
 }
 @Test void matchingIsExplainableAndHandlesMissingRequirements() throws Exception {
  var result=matching.match("Java, React.js, Java","java, REACT");
  assertEquals(100,result.get("score")); assertNull(matching.match("", "Java").get("score"));
  assertEquals(0,matching.match("Java","JavaScript").get("score"));
  mvc.perform(get("/api/workspace/match/"+job.getId()).param("candidateId",candidate.getId().toString())
   .with(httpBasic("other@test.test","password123"))).andExpect(status().isForbidden());
  mvc.perform(get("/api/workspace/match/"+job.getId()).param("candidateId",candidate.getId().toString())
   .with(httpBasic("recruiter@test.test","password123"))).andExpect(status().isOk()).andExpect(jsonPath("$.missingSkills.length()").value(3));
 }
 @Test void owningRecruiterCanScheduleButOtherCompanyCannot() throws Exception {
  String body=json.writeValueAsString(Map.of("interviewAt",java.time.Instant.now().plusSeconds(86400).toString(),"durationMinutes",30,"location","Room 1"));
  String url="/api/applications/"+application.getId()+"/interview";
  mvc.perform(put(url).with(httpBasic("other@test.test","password123")).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
  mvc.perform(put(url).with(httpBasic("recruiter@test.test","password123")).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
  mvc.perform(delete(url).with(httpBasic("other@test.test","password123"))).andExpect(status().isForbidden());
 }
}
