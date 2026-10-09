package net.jrodolfo.jobportal.service;

import net.jrodolfo.jobportal.constant.ApplicationStatus;
import net.jrodolfo.jobportal.constant.AuthProvider;
import net.jrodolfo.jobportal.constant.JobStatus;
import net.jrodolfo.jobportal.constant.Role;
import net.jrodolfo.jobportal.dto.ScheduleInterviewRequest;
import net.jrodolfo.jobportal.exception.ResourceException;
import net.jrodolfo.jobportal.model.Application;
import net.jrodolfo.jobportal.model.Job;
import net.jrodolfo.jobportal.model.User;
import net.jrodolfo.jobportal.repository.ApplicationRepository;
import net.jrodolfo.jobportal.repository.JobRepository;
import net.jrodolfo.jobportal.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Service class for managing {@link Application} entities.
 * Provides methods for users to apply for jobs and for administrators to manage applications.
 */
@Service
public class ApplicationService {
    @Autowired(required = false)
    private net.jrodolfo.jobportal.repository.ApplicationHistoryRepository historyRepository;

    private Application saveWithHistory(Application application) {
        Application saved = applicationRepository.save(application);
        if (historyRepository != null) {
            var event = new net.jrodolfo.jobportal.model.ApplicationHistory();
            event.setApplicationId(saved.getId());
            event.setStage(saved.getStatus().name());
            var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            event.setActorName(authentication == null ? "System" : authentication.getName());
            event.setCreatedAt(java.time.LocalDateTime.now());
            historyRepository.save(event);
        }
        return saved;
    }

    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final ApplicationRepository applicationRepository;

    /**
     * Constructs an {@code ApplicationService} with necessary repositories.
     *
     * @param userRepository        the repository for user data
     * @param jobRepository         the repository for job data
     * @param applicationRepository the repository for application data
     */
    @Autowired
    public ApplicationService(UserRepository userRepository,
                              JobRepository jobRepository,
                              ApplicationRepository applicationRepository) {
        this.userRepository = userRepository;
        this.jobRepository = jobRepository;
        this.applicationRepository = applicationRepository;
    }

    /**
     * Creates a new application or restores a withdrawn one for a user applying to a specific job.
     *
     * @param email the email of the user applying for the job
     * @param jobId    the ID of the job to apply for
     * @return the saved {@link Application}
     * @throws ResourceException       if the job is not found
     * @throws ResponseStatusException if the job is closed or if an active application already exists
     */
    @org.springframework.transaction.annotation.Transactional
    public Application applyForJob(String email, Long jobId) {
        User user = resolveApplicantUser(email);
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceException("Job with id " + jobId + " was not found"));

        if (job.getStatus() == JobStatus.CLOSED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot apply to a closed job");
        }

        Application existingApplication = applicationRepository.findByUserAndJob(user, job).orElse(null);
        if (existingApplication != null) {
            if (existingApplication.getStatus() == ApplicationStatus.WITHDRAWN) {
                existingApplication.setStatus(ApplicationStatus.APPLIED);
                return saveWithHistory(existingApplication);
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Application already exists for this user and job");
        }

        Application application = new Application(user, job);
        return saveWithHistory(application);
    }

    private User resolveApplicantUser(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseGet(() -> userRepository.save(createLocalApplicantUser(email)));
    }

    private User createLocalApplicantUser(String email) {
        return new User(email, email, null, AuthProvider.LOCAL, Role.APPLICANT);
    }

    /**
     * Retrieves all applications in the system.
     *
     * @return a list of all {@link Application} entities
     */
    public List<Application> getAllApplications() {
        return applicationRepository.findAll();
    }

    /**
     * Retrieves all applications submitted by a specific user.
     *
     * @param email the email of the user
     * @return a list of {@link Application} entities associated with the user
     */
    public List<Application> getApplicationsByEmail(String email) {
        return applicationRepository.findByUser_EmailIgnoreCase(email);
    }

    /**
     * Retrieves a specific application by its ID.
     *
     * @param id the ID of the application
     * @return the {@link Application} if found
     * @throws ResourceException if the application is not found
     */
    public Application getApplicationById(Long id) {
        return applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceException("Application with id " + id + " was not found"));
    }

    /**
     * Updates the status of an existing application.
     *
     * @param id     the ID of the application to update
     * @param status the new {@link ApplicationStatus}
     * @return the updated {@link Application}
     * @throws ResourceException if the application is not found
     */
    @org.springframework.transaction.annotation.Transactional
    public Application updateApplicationStatus(Long id, ApplicationStatus status) {
        Application application = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceException("Application with id " + id + " was not found"));
        if (application.getStatus() == status) return application;
        application.setStatus(status);
        if (status == ApplicationStatus.REJECTED || status == ApplicationStatus.WITHDRAWN) {
            clearInterview(application);
        }
        return saveWithHistory(application);
    }

    public Application scheduleInterview(Long id, ScheduleInterviewRequest request) {
        Application application = getApplicationById(id);
        if (application.getStatus() == ApplicationStatus.REJECTED
                || application.getStatus() == ApplicationStatus.WITHDRAWN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Reopen this application before scheduling an interview.");
        }
        application.setInterviewAt(request.interviewAt());
        application.setInterviewDurationMinutes(request.durationMinutes());
        application.setInterviewLocation(request.location().trim());
        application.setInterviewNotes(request.notes() == null ? null : request.notes().trim());
        return applicationRepository.save(application);
    }

    public Application cancelInterview(Long id) {
        Application application = getApplicationById(id);
        clearInterview(application);
        return applicationRepository.save(application);
    }

    private void clearInterview(Application application) {
        application.setInterviewAt(null);
        application.setInterviewDurationMinutes(null);
        application.setInterviewLocation(null);
        application.setInterviewNotes(null);
    }

    /**
     * Deletes an application from the system.
     *
     * @param id the ID of the application to delete
     * @throws ResourceException if the application is not found
     */
    public void deleteApplication(Long id) {
        if (!applicationRepository.existsById(id)) {
            throw new ResourceException("Application with id " + id + " was not found");
        }
        applicationRepository.deleteById(id);
    }
}
