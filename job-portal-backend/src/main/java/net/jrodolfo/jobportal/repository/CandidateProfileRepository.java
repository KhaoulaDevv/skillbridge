package net.jrodolfo.jobportal.repository;
import net.jrodolfo.jobportal.model.CandidateProfile;
import org.springframework.data.jpa.repository.JpaRepository;
public interface CandidateProfileRepository extends JpaRepository<CandidateProfile,Long> {  }

