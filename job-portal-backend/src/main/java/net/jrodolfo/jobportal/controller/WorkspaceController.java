package net.jrodolfo.jobportal.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import net.jrodolfo.jobportal.constant.*;
import net.jrodolfo.jobportal.model.*;
import net.jrodolfo.jobportal.repository.*;
import net.jrodolfo.jobportal.service.*;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.security.Principal;
import java.time.*;
import java.util.*;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;

@RestController @RequestMapping("/api/workspace") @RequiredArgsConstructor
public class WorkspaceController {
    private final WorkspaceAccess access;
    private final UserRepository users;
    private final CompanyRepository companies;
    private final CandidateProfileRepository profiles;
    private final JobRepository jobs;
    private final ApplicationRepository applications;
    private final ApplicationMessageRepository messages;
    private final ApplicationHistoryRepository history;
    private final ApplicationService applicationService;
    private final SkillMatchingService matching;
    private final PasswordEncoder passwords;
    private final InterviewFeedbackRepository feedback;

    public record ProfileInput(@Size(max=255) String headline,@Size(max=2000) String skills,
        @Size(max=4000) String education,@Size(max=4000) String projects,@Size(max=500) String portfolioUrl,
        @Size(max=255) String location,@Size(max=255) String availability) {}
    public record CompanyInput(@NotBlank @Size(max=255) String name,@Size(max=500) String website,
        @Size(max=2000) String description,String recruiterName,String recruiterEmail,String password) {}
    public record JobInput(@NotBlank @Size(max=255) String title,@NotBlank @Size(max=2000) String description,
        Long companyId,@Size(max=255) String company,@Size(max=2000) String requiredSkills,
        @Size(max=255) String location,@Size(max=255) String employmentType,JobStatus status) {}
    public record StageInput(@NotNull ApplicationStatus stage) {}
    public record MessageInput(@NotBlank @Size(max=4000) String body) {}
    public record FeedbackInput(@Min(1) @Max(5) Integer rating,@NotBlank String recommendation,
        @Size(max=2000) String strengths,@Size(max=2000) String concerns,@Size(max=4000) String notes) {}

    @GetMapping("/me")
    public User me(Principal principal) { return access.user(principal.getName()); }

    @GetMapping("/profile")
    public CandidateProfile profile(Principal principal) { return profileFor(me(principal).getId()); }
    private CandidateProfile profileFor(Long id) {
        return profiles.findById(id).orElseGet(() -> { var p=new CandidateProfile(); p.setId(id); return p; });
    }
    @PutMapping("/profile")
    public CandidateProfile saveProfile(Principal principal,@Valid @RequestBody ProfileInput input) {
        var user=me(principal); if(user.getRole()!=Role.APPLICANT) WorkspaceAccess.deny();
        safeUrl(input.portfolioUrl());
        var p=profileFor(user.getId());
        p.setHeadline(input.headline()); p.setSkills(input.skills()); p.setEducation(input.education());
        p.setProjects(input.projects()); p.setPortfolioUrl(input.portfolioUrl());
        p.setLocation(input.location()); p.setAvailability(input.availability());
        return profiles.save(p);
    }
    @GetMapping("/profiles/{id}")
    public CandidateProfile candidateProfile(Principal principal,@PathVariable Long id) {
        access.profile(me(principal),id); return profileFor(id);
    }
    @PostMapping("/profile/cv")
    public CandidateProfile uploadCv(Principal principal,@RequestParam("file") MultipartFile file) throws java.io.IOException {
        var user=me(principal); if(user.getRole()!=Role.APPLICANT) WorkspaceAccess.deny();
        if(file.isEmpty() || file.getSize()>5*1024*1024) throw bad("Choose a PDF smaller than 5 MB");
        byte[] bytes=file.getBytes();
        if(bytes.length<5 || !new String(bytes,0,5,java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-")) throw bad("Only PDF documents are supported");
        var p=profileFor(user.getId()); p.setCvData(bytes);
        try (var pdf=Loader.loadPDF(bytes)) {
            String text=new PDFTextStripper().getText(pdf);
            String lower=text.toLowerCase(Locale.ROOT);
            var detected=CV_SKILLS.stream().filter(s -> lower.matches("(?s).*\\b"+java.util.regex.Pattern.quote(s)+"\\b.*")).sorted().toList();
            p.setExtractedSkills(String.join(", ", detected));
            p.setExtractionSummary(detected.isEmpty()?"No known skills detected. Add skills manually to improve matching.":"Detected " + detected.size() + " skill(s) from CV text; review before saving.");
        } catch (Exception ignored) { p.setExtractionSummary("CV uploaded, but text could not be extracted. Add skills manually."); }
        String name=Objects.toString(file.getOriginalFilename(),"cv.pdf").replaceAll("[^a-zA-Z0-9._ -]","_");
        p.setCvName(name.substring(0,Math.min(name.length(),255))); return profiles.save(p);
    }
    private static final Set<String> CV_SKILLS = Set.of("java","spring boot","react","javascript","typescript","node.js","python","php","laravel","angular","sql","mysql","postgresql","docker","kubernetes","aws","azure","git","html","css");

    @GetMapping("/applications/{id}/feedback")
    public List<InterviewFeedback> feedback(Principal principal,@PathVariable Long id) { access.application(me(principal),id); return feedback.findByApplicationIdOrderByCreatedAtDescIdDesc(id); }
    @PostMapping("/applications/{id}/feedback")
    public InterviewFeedback addFeedback(Principal principal,@PathVariable Long id,@Valid @RequestBody FeedbackInput input) {
        var u=me(principal); var a=access.application(u,id); if(!access.manages(u,a.getJob())) WorkspaceAccess.deny();
        var f=new InterviewFeedback(); f.setApplicationId(id); f.setInterviewerId(u.getId()); f.setInterviewerName(u.getName());
        f.setRating(input.rating()); f.setRecommendation(input.recommendation()); f.setStrengths(input.strengths()); f.setConcerns(input.concerns()); f.setNotes(input.notes()); f.setCreatedAt(LocalDateTime.now()); return feedback.save(f);
    }
    @GetMapping("/profiles/{id}/cv")
    public ResponseEntity<byte[]> cv(Principal principal,@PathVariable Long id) {
        access.profile(me(principal),id); var p=profileFor(id);
        if(p.getCvData()==null) throw missing("No CV uploaded");
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(p.getCvName()).build().toString())
            .header("X-Content-Type-Options","nosniff").body(p.getCvData());
    }
    @GetMapping("/companies")
    public List<Company> companies(Principal principal) {
        var u=me(principal);
        return u.getRole()==Role.ADMIN?companies.findAll():companies.findByOwnerId(u.getId()).stream().toList();
    }
    @PostMapping("/companies") @Transactional
    public Company createCompany(Principal principal,@Valid @RequestBody CompanyInput input) {
        if(me(principal).getRole()!=Role.ADMIN) WorkspaceAccess.deny();
        safeUrl(input.website());
        if(input.recruiterName()==null || input.recruiterName().isBlank() || input.recruiterName().length()>255
            || input.recruiterEmail()==null || !input.recruiterEmail().matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+") || input.recruiterEmail().length()>255
            || input.password()==null || input.password().length()<10 || input.password().length()>72)
            throw bad("Recruiter name, valid email and a password of 10–72 characters are required");
        String email=input.recruiterEmail().trim().toLowerCase(Locale.ROOT);
        if(users.existsByEmailIgnoreCase(email)) throw new ResponseStatusException(HttpStatus.CONFLICT,"An account already uses this email");
        var u=users.save(new User(input.recruiterName().trim(),email,passwords.encode(input.password()),AuthProvider.LOCAL,Role.RECRUITER));
        var c=new Company(); c.setName(input.name().trim()); c.setWebsite(input.website());
        c.setDescription(input.description()); c.setOwnerId(u.getId()); return companies.save(c);
    }
    @PutMapping("/companies/{id}")
    public Company updateCompany(Principal principal,@PathVariable Long id,@Valid @RequestBody CompanyInput input) {
        var u=me(principal); var c=companies.findById(id).orElseThrow(() -> missing("Company not found"));
        if(u.getRole()!=Role.ADMIN && !c.getOwnerId().equals(u.getId())) WorkspaceAccess.deny();
        safeUrl(input.website()); c.setName(input.name().trim()); c.setWebsite(input.website()); c.setDescription(input.description());
        return companies.save(c);
    }
    @GetMapping("/jobs")
    public List<Job> jobs(Principal principal) {
        var u=me(principal);
        return jobs.findAll().stream().filter(j -> u.getRole()==Role.APPLICANT?j.getStatus()==JobStatus.OPEN:access.manages(u,j)).toList();
    }
    @PostMapping("/jobs")
    public Job createJob(Principal principal,@Valid @RequestBody JobInput input) {
        var u=me(principal); access.staff(u); return saveJob(u,new Job(),input);
    }
    @PutMapping("/jobs/{id}")
    public Job updateJob(Principal principal,@PathVariable Long id,@Valid @RequestBody JobInput input) {
        var u=me(principal); access.staff(u); var j=job(id);
        if(!access.manages(u,j)) WorkspaceAccess.deny(); return saveJob(u,j,input);
    }
    private Job saveJob(User u,Job j,JobInput input) {
        Long companyId=input.companyId();
        if(u.getRole()==Role.RECRUITER) companyId=companies.findByOwnerId(u.getId()).orElseThrow(() -> missing("Company workspace not found")).getId();
        // Applications and conversations retain their original company ownership.
        if(j.getId()!=null && !Objects.equals(j.getCompanyId(),companyId) && applications.existsByJob_Id(j.getId()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"A job with applications cannot move to another company");
        if(companyId!=null) {
            var c=companies.findById(companyId).orElseThrow(() -> missing("Company not found"));
            j.setCompany(c.getName()); j.setCompanyId(c.getId());
        } else {
            if(input.company()==null || input.company().isBlank()) throw bad("Company is required");
            j.setCompany(input.company().trim()); j.setCompanyId(null);
        }
        j.setTitle(input.title().trim()); j.setDescription(input.description().trim());
        j.setRequiredSkills(input.requiredSkills()); j.setLocation(input.location()); j.setEmploymentType(input.employmentType());
        if(input.status()!=null) j.setStatus(input.status()); return jobs.save(j);
    }
    private Job job(Long id) { return jobs.findById(id).orElseThrow(() -> missing("Job not found")); }
    @GetMapping("/applications")
    public List<Application> applications(Principal principal) {
        var u=me(principal); return applications.findAll().stream()
            .filter(a -> access.manages(u,a.getJob()) || (u.getRole()==Role.APPLICANT && a.getUser().getId().equals(u.getId()))).toList();
    }
    @PutMapping("/applications/{id}/stage") @Transactional
    public Application stage(Principal principal,@PathVariable Long id,@Valid @RequestBody StageInput input) {
        var u=me(principal); var a=access.application(u,id);
        if(!access.manages(u,a.getJob()) && input.stage()!=ApplicationStatus.WITHDRAWN) WorkspaceAccess.deny();
        if(a.getStatus()==input.stage()) return a;
        return applicationService.updateApplicationStatus(id,input.stage());
    }
    @GetMapping("/applications/{id}/history")
    public List<ApplicationHistory> history(Principal principal,@PathVariable Long id) {
        access.application(me(principal),id); return history.findByApplicationIdOrderByCreatedAtAscIdAsc(id);
    }
    @GetMapping("/match/{jobId}")
    public Map<String,Object> match(Principal principal,@PathVariable Long jobId,@RequestParam(required=false) Long candidateId) {
        var u=me(principal); Long candidate=candidateId==null?u.getId():candidateId; var j=job(jobId);
        if(!candidate.equals(u.getId())) {
            if(!access.manages(u,j) || applications.findAll().stream().noneMatch(a -> a.getJob().getId().equals(jobId) && a.getUser().getId().equals(candidate))) WorkspaceAccess.deny();
        }
        return matching.match(j.getRequiredSkills(),profileFor(candidate).getSkills());
    }
    @GetMapping("/applications/{id}/messages")
    public List<ApplicationMessage> messages(Principal principal,@PathVariable Long id) {
        access.application(me(principal),id); return messages.findByApplicationIdOrderByCreatedAtAscIdAsc(id);
    }
    @PostMapping("/applications/{id}/messages")
    public ApplicationMessage sendMessage(Principal principal,@PathVariable Long id,@Valid @RequestBody MessageInput input) {
        var u=me(principal); access.application(u,id);
        var m=new ApplicationMessage(); m.setApplicationId(id); m.setSenderId(u.getId()); m.setSenderName(u.getName());
        m.setBody(input.body().trim()); m.setCreatedAt(LocalDateTime.now()); return messages.save(m);
    }
    @GetMapping("/analytics")
    public Map<String,Object> analytics(Principal principal) {
        var u=me(principal); access.staff(u); var all=applications(principal); var jobList=jobs(principal);
        Map<String,Long> stages=new LinkedHashMap<>();
        for(var stage:ApplicationStatus.values()) stages.put(stage.name(),all.stream().filter(a -> a.getStatus()==stage).count());
        var result=new LinkedHashMap<String,Object>();
        result.put("jobs",jobList.size()); result.put("applications",all.size()); result.put("stages",stages);
        result.put("hires",stages.get("HIRED")); result.put("interviews",all.stream().filter(a -> a.getInterviewAt()!=null).count());
        result.put("applicationsByJob",jobList.stream().map(j -> Map.of("jobId",j.getId(),"title",j.getTitle(),"count",all.stream().filter(a -> a.getJob().getId().equals(j.getId())).count())).toList());
        var durations=all.stream().filter(a -> a.getStatus()==ApplicationStatus.HIRED).mapToDouble(a -> {
            var hired=history.findByApplicationIdOrderByCreatedAtAscIdAsc(a.getId()).stream().filter(h -> h.getStage().equals("HIRED")).findFirst();
            return hired.map(h -> Math.max(0,Duration.between(a.getCreatedAt(),h.getCreatedAt()).toHours()/24.0)).orElse(Double.NaN);
        }).filter(Double::isFinite).average();
        result.put("averageDaysToHire",durations.isPresent()?Math.round(durations.getAsDouble()*10)/10.0:null);
        return result;
    }
    private static void safeUrl(String url) {
        if(url==null || url.isBlank()) return;
        try { var uri=java.net.URI.create(url); if(!("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme())) || uri.getHost()==null) throw bad("Use a full http or https URL"); }
        catch(IllegalArgumentException e) { throw bad("Use a valid URL"); }
    }
    private static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
    private static ResponseStatusException missing(String message) { return new ResponseStatusException(HttpStatus.NOT_FOUND,message); }
}
