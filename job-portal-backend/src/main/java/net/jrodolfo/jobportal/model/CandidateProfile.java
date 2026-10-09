package net.jrodolfo.jobportal.model;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
@Entity @Table(name="candidate_profiles") @Getter @Setter
public class CandidateProfile {
@Id  private Long id;
@Column(length=255) private String headline;
@Column(length=2000) private String skills;
@Column(length=4000) private String education;
@Column(length=4000) private String projects;
@Column(length=500) private String portfolioUrl;
private String location;
private String availability;
private String cvName;
@Column(length=2000) private String extractedSkills;
@Column(length=1000) private String extractionSummary;
@Lob @com.fasterxml.jackson.annotation.JsonIgnore private byte[] cvData;
}
