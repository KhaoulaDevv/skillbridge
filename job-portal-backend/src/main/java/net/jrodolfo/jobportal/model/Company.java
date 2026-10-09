package net.jrodolfo.jobportal.model;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
@Entity @Table(name="companies") @Getter @Setter
public class Company {
@Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
private String name;
@Column(length=500) private String website;
@Column(length=2000) private String description;
@Column(nullable=false,unique=true) private Long ownerId;
}

