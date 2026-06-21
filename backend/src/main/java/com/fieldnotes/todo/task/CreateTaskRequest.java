package com.fieldnotes.todo.task;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTaskRequest(
        @NotBlank(message = "Task text cannot be empty")
        @Size(max = 140, message = "Task text must be 140 characters or fewer")
        String text
) {
}
