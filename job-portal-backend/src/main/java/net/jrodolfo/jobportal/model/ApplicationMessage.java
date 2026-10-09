package net.jrodolfo.jobportal.model;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
@Entity @Table(name="application_messages") @Getter @Setter
public class ApplicationMessage {
@Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
private Long applicationId;
private Long senderId;
private String senderName;
@Column(length=4000) private String body;
private java.time.LocalDateTime createdAt;
}

