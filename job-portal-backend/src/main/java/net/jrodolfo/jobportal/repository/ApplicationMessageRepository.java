package net.jrodolfo.jobportal.repository;
import net.jrodolfo.jobportal.model.ApplicationMessage;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ApplicationMessageRepository extends JpaRepository<ApplicationMessage,Long> { java.util.List<ApplicationMessage> findByApplicationIdOrderByCreatedAtAscIdAsc(Long applicationId); }

