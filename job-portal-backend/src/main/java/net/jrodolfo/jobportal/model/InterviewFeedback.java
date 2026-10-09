package net.jrodolfo.jobportal.model;
import jakarta.persistence.*; import lombok.Getter; import lombok.Setter;
@Entity @Table(name="interview_feedback") @Getter @Setter
public class InterviewFeedback { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
private Long applicationId; private Long interviewerId; private String interviewerName; private Integer rating;
private String recommendation; @Column(length=2000) private String strengths; @Column(length=2000) private String concerns;
@Column(length=4000) private String notes; private java.time.LocalDateTime createdAt; }
