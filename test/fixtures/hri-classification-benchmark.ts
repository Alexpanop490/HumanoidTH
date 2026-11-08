export const hriClassificationBenchmark = [
  {
    id: "pepper-relaxation-positive",
    title: "Humanoid robot-assisted relaxation in outpatient mental health care",
    abstract: "Adults at a mental health clinic completed guided relaxation with the physical Pepper humanoid robot. Participants reported lower anxiety after the sessions.",
    expected: { isHriRelevant: true, interactionOutcome: "positive" }
  },
  {
    id: "nao-therapy-mixed",
    title: "Patient experiences with a humanoid robot during therapy",
    abstract: "Patients interacted with the NAO robot during therapy. Some described the sessions as reassuring, while others reported discomfort and preferred a human therapist.",
    expected: { isHriRelevant: true, interactionOutcome: "mixed" }
  },
  {
    id: "care-robot-no-outcome",
    title: "A pilot of a humanoid robot in a psychiatric ward",
    abstract: "A physically present humanoid robot was used in a psychiatric ward. The article describes the study protocol but reports no participant responses or outcome results.",
    expected: { isHriRelevant: true, interactionOutcome: "unclear" }
  },
  {
    id: "telehealth-without-robot",
    title: "Video telehealth for psychological counseling",
    abstract: "This study evaluates video consultations between patients and clinicians. No robot or robotic system is used.",
    expected: { isHriRelevant: false, interactionOutcome: "unclear" }
  },
  {
    id: "proposed-robot-no-interaction",
    title: "A proposal for humanoid robots in mental health services",
    abstract: "The authors propose a future humanoid robot service for mental health clinics. No robot was built, deployed, or evaluated with patients.",
    expected: { isHriRelevant: false, interactionOutcome: "unclear" }
  },
  {
    id: "robot-study-neutral",
    title: "Humanoid robot interaction for emotional support",
    abstract: "Participants spoke with a humanoid robot during a supervised care session. The study found no measurable change in distress and participants reported neither benefit nor harm.",
    expected: { isHriRelevant: true, interactionOutcome: "neutral" }
  }
] as const;
