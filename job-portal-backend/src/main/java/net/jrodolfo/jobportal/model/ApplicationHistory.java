package net.jrodolfo.jobportal.model;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
@Entity @Table(name="application_history") @Getter @Setter
public class ApplicationHistory {
@Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
private Long applicationId;
private String stage;
private String actorName;
private java.time.LocalDateTime createdAt;
}

