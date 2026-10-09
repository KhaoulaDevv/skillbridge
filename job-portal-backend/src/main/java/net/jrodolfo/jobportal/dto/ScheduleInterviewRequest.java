package net.jrodolfo.jobportal.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record ScheduleInterviewRequest(
        @NotNull @Future Instant interviewAt,
        @NotNull @Min(15) @Max(480) Integer durationMinutes,
        @NotBlank @Size(max = 500) String location,
        @Size(max = 2000) String notes
) {}
