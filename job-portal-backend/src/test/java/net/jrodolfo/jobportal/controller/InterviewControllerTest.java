package net.jrodolfo.jobportal.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import net.jrodolfo.jobportal.constant.ApplicationStatus;
import net.jrodolfo.jobportal.model.Application;
import net.jrodolfo.jobportal.model.Job;
import net.jrodolfo.jobportal.repository.ApplicationRepository;
import net.jrodolfo.jobportal.repository.JobRepository;
import net.jrodolfo.jobportal.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class InterviewControllerTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired ApplicationRepository applications;
    @Autowired JobRepository jobs;
    @Autowired UserRepository users;
    Application application;

    @BeforeEach
    void setUp() {
        Job job = jobs.save(new Job("Interview test", "Build software", "Test company"));
        application = applications.save(new Application(users.findByEmailIgnoreCase("user@local.test").orElseThrow(), job));
    }

    String payload(Instant at, String location) throws Exception {
        return json.writeValueAsString(Map.of("interviewAt", at.toString(), "durationMinutes", 45,
                "location", location, "notes", "Bring your portfolio"));
    }

    @Test
    void administratorCanScheduleRescheduleAndCancelAndApplicantCanRead() throws Exception {
        String url = "/api/applications/" + application.getId() + "/interview";
        Instant at = Instant.now().plusSeconds(86400).truncatedTo(java.time.temporal.ChronoUnit.SECONDS);
        mvc.perform(put(url).with(httpBasic("admin@local.test", "admin123"))
                .contentType(MediaType.APPLICATION_JSON).content(payload(at, "Room 4")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.interviewLocation").value("Room 4"));
        assertEquals(at, applications.findById(application.getId()).orElseThrow().getInterviewAt());
        mvc.perform(get("/api/applications/" + application.getId()).with(httpBasic("user@local.test", "user123")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.interviewAt").value(at.toString()));
        mvc.perform(put(url).with(httpBasic("admin@local.test", "admin123"))
                .contentType(MediaType.APPLICATION_JSON).content(payload(at.plusSeconds(3600), "https://example.com/meeting")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.interviewDurationMinutes").value(45));
        mvc.perform(delete(url).with(httpBasic("admin@local.test", "admin123")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.interviewAt").isEmpty());
        assertNull(applications.findById(application.getId()).orElseThrow().getInterviewLocation());
    }

    @Test
    void applicantCannotScheduleOrCancelAndAnonymousCannotSchedule() throws Exception {
        String url = "/api/applications/" + application.getId() + "/interview";
        String body = payload(Instant.now().plusSeconds(86400), "Room 4");
        mvc.perform(put(url).with(httpBasic("user@local.test", "user123"))
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(delete(url).with(httpBasic("user@local.test", "user123"))).andExpect(status().isForbidden());
        mvc.perform(put(url).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsPastDatesBlankLocationsAndInactiveApplications() throws Exception {
        String url = "/api/applications/" + application.getId() + "/interview";
        mvc.perform(put(url).with(httpBasic("admin@local.test", "admin123"))
                .contentType(MediaType.APPLICATION_JSON).content(payload(Instant.now().minusSeconds(60), "Room 4")))
                .andExpect(status().isBadRequest());
        mvc.perform(put(url).with(httpBasic("admin@local.test", "admin123"))
                .contentType(MediaType.APPLICATION_JSON).content(payload(Instant.now().plusSeconds(86400), "   ")))
                .andExpect(status().isBadRequest());
        application.setStatus(ApplicationStatus.REJECTED);
        applications.save(application);
        mvc.perform(put(url).with(httpBasic("admin@local.test", "admin123"))
                .contentType(MediaType.APPLICATION_JSON).content(payload(Instant.now().plusSeconds(86400), "Room 4")))
                .andExpect(status().isConflict());
    }

    @Test
    void withdrawingApplicationRemovesScheduledInterview() throws Exception {
        application.setInterviewAt(Instant.now().plusSeconds(86400));
        application.setInterviewLocation("Room 4");
        applications.save(application);
        mvc.perform(put("/api/applications/" + application.getId()).param("status", "WITHDRAWN")
                .with(httpBasic("user@local.test", "user123")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.interviewAt").isEmpty());
    }
}
