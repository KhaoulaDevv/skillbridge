package net.jrodolfo.jobportal.repository;
import net.jrodolfo.jobportal.model.Company;
import org.springframework.data.jpa.repository.JpaRepository;
public interface CompanyRepository extends JpaRepository<Company,Long> { java.util.Optional<Company> findByOwnerId(Long ownerId); }

