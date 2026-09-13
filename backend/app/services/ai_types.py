"""Shared data shapes for AI update generation. Kept dependency-free (no DB,
no provider imports) so both ai_update_service.py (gathers this from the DB)
and ai_provider.py (turns it into a prompt or a template) can import it
without creating a circular import between the two."""

from dataclasses import dataclass, field


@dataclass
class GradeFact:
    subject: str
    score_pct: float
    assessment_name: str | None = None


@dataclass
class UpdateContext:
    student_first_name: str
    class_label: str | None
    attendance_rate: float | None  # None when there are no attendance records at all
    grades: list[GradeFact] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)  # most recent first

    @property
    def has_any_data(self) -> bool:
        return self.attendance_rate is not None or bool(self.grades) or bool(self.notes)


@dataclass
class GeneratedUpdate:
    english_text: str
    roman_urdu_text: str
    urdu_text: str
