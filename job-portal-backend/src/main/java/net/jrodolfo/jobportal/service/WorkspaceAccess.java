package net.jrodolfo.jobportal.service;

import net.jrodolfo.jobportal.model.*;
import net.jrodolfo.jobportal.repository.*;
import net.jrodolfo.jobportal.constant.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@Service @RequiredArgsConstructor
public class WorkspaceAccess {
    private final UserRepository users;
    private final CompanyRepository companies;
    private final ApplicationRepository applications;
    public User user(String email) {
        return users.findByEmailIgnoreCase(email).filter(User::isEnabled)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,"Account unavailable"));
    }
    public void staff(User user) {
        if(user.getRole()!=Role.ADMIN && user.getRole()!=Role.RECRUITER) deny();
    }
    public boolean manages(User user, Job job) {
        return user.getRole()==Role.ADMIN || (user.getRole()==Role.RECRUITER && job.getCompanyId()!=null
            && companies.findById(job.getCompanyId()).map(c -> c.getOwnerId().equals(user.getId())).orElse(false));
    }
    public Application application(User user, Long id) {
        Application a=applications.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Application not found"));
        if(!manages(user,a.getJob()) && !(user.getRole()==Role.APPLICANT && a.getUser().getId().equals(user.getId()))) deny();
        return a;
    }
    public void profile(User user, Long candidateId) {
        if(user.getId().equals(candidateId) || user.getRole()==Role.ADMIN) return;
        if(user.getRole()==Role.RECRUITER && applications.findAll().stream()
            .anyMatch(a -> a.getUser().getId().equals(candidateId) && manages(user,a.getJob()))) return;
        deny();
    }
    public static void deny() { throw new ResponseStatusException(HttpStatus.FORBIDDEN,"You do not have access to this workspace"); }
}

