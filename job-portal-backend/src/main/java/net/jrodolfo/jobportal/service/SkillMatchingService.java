package net.jrodolfo.jobportal.service;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.stream.Collectors;
@Service
public class SkillMatchingService {
    public Set<String> normalize(String skills) {
        if(skills==null || skills.isBlank()) return new LinkedHashSet<>();
        return Arrays.stream(skills.split("[,;\\n]")).map(String::trim).map(s -> s.toLowerCase(Locale.ROOT))
            .filter(s -> !s.isEmpty()).map(s -> switch(s) {
                case "js", "javascript" -> "javascript";
                case "ts", "typescript" -> "typescript";
                case "react.js", "reactjs", "react" -> "react";
                case "node.js", "nodejs", "node" -> "node.js";
                case "springboot", "spring boot" -> "spring boot";
                case "postgres", "postgresql" -> "postgresql";
                default -> s;
            }).collect(Collectors.toCollection(LinkedHashSet::new));
    }
    public Map<String,Object> match(String required, String candidate) {
        var requirements=normalize(required); var skills=normalize(candidate);
        var matched=requirements.stream().filter(skills::contains).toList();
        var missing=requirements.stream().filter(s -> !skills.contains(s)).toList();
        Map<String,Object> result=new LinkedHashMap<>();
        result.put("score",requirements.isEmpty()?null:(int)Math.round(100.0*matched.size()/requirements.size()));
        result.put("requiredSkills",requirements); result.put("matchedSkills",matched); result.put("missingSkills",missing);
        result.put("method","Normalized skill coverage v1");
        result.put("explanation",requirements.isEmpty()?"No required skills have been specified; no score is calculated."
            :matched.size()+" of "+requirements.size()+" required skills matched. Score = matched / required × 100. Case and common aliases are normalized; each skill has equal weight. This is decision support, not an automatic hiring decision.");
        return result;
    }
}

