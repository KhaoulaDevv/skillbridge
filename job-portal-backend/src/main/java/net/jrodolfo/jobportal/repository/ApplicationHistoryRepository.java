package net.jrodolfo.jobportal.repository;
import net.jrodolfo.jobportal.model.ApplicationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ApplicationHistoryRepository extends JpaRepository<ApplicationHistory,Long> { java.util.List<ApplicationHistory> findByApplicationIdOrderByCreatedAtAscIdAsc(Long applicationId); }

