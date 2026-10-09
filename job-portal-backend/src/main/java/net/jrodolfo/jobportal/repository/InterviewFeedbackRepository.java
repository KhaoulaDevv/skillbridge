package net.jrodolfo.jobportal.repository;
import net.jrodolfo.jobportal.model.InterviewFeedback; import org.springframework.data.jpa.repository.JpaRepository; import java.util.List;
public interface InterviewFeedbackRepository extends JpaRepository<InterviewFeedback,Long> { List<InterviewFeedback> findByApplicationIdOrderByCreatedAtDescIdDesc(Long applicationId); }
