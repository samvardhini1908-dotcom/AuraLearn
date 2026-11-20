const STOP_WORDS = new Set(
  `a about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just may me more most must my myself no nor not of off on once only or other ought our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves`.split(
    /\s+/,
  ),
);

const DEFINITION_PATTERNS = [
  /^(.{1,100}?)\s+(?:is|are)\s+(?:(?:a|an|the)\s+)?(.+)$/i,
  /^(.{1,100}?)\s+(?:refers to|means)\s+(.+)$/i,
  /^([^:]{1,100}):\s*(.{2,})$/,
];

const CAPITALIZED_TERM_PATTERN =
  /\b(?:[A-Z]{2,}[A-Z0-9-]*|[A-Z][a-zA-Z0-9]*(?:[ -][A-Z][a-zA-Z0-9]*){0,3})\b/g;
const TOKEN_PATTERN = /[\p{L}][\p{L}\p{N}'-]*/gu;
const MIN_QUIZ_CONCEPTS = 4;
const LOW_EASE_THRESHOLD = 2.3;

function splitSentences(rawContent) {
  return rawContent
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .flatMap((line) => {
      const cleanLine = line.replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/, "").trim();
      return cleanLine ? cleanLine.split(/(?<=[.!?])\s+/u) : [];
    })
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function cleanTerm(value) {
  let term = value
    .replace(/^[\s"'`“”‘’([{]+|[\s"'`“”‘’)\]}.,;:!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  term = term
    .replace(
      /^(?:(?:the|a|an|this|these|those|in|on|at|for|from|when|while|because|however|therefore)\s+)+/i,
      "",
    )
    .trim();
  const commaParts = term.split(/\s*,\s*/);
  if (commaParts.length > 1) {
    term = commaParts[commaParts.length - 1];
  }

  const words = term.split(/\s+/);
  if (words.length > 5) {
    term = words.slice(-4).join(" ");
  }

  if (
    term.length < 2 ||
    term.length > 80 ||
    STOP_WORDS.has(term.toLocaleLowerCase()) ||
    /^(?:definition|example|note|notes|content|chapter|section)$/i.test(term)
  ) {
    return "";
  }

  return term;
}

function cleanDefinition(value) {
  return value
    .replace(/^[\s"'`“”‘’([{]+|[\s"'`“”‘’)\]}]+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.;!?]+$/g, "")
    .trim();
}

function findDefinition(sentence) {
  for (const pattern of DEFINITION_PATTERNS) {
    const match = sentence.match(pattern);
    if (!match) {
      continue;
    }

    const term = cleanTerm(match[1]);
    const definition = cleanDefinition(match[2]);
    if (term && definition.length >= 3) {
      return { term, definition };
    }
  }

  return null;
}

function getTokens(text) {
  return [...text.matchAll(TOKEN_PATTERN)].map((match) => ({
    word: match[0],
    normalized: match[0].toLocaleLowerCase().replace(/^['-]+|['-]+$/g, ""),
  }));
}

function extractTopKeywords(rawContent) {
  const frequencies = new Map();
  for (const token of getTokens(rawContent)) {
    if (
      token.normalized.length < 3 ||
      STOP_WORDS.has(token.normalized) ||
      /^\d+$/.test(token.normalized)
    ) {
      continue;
    }

    const current = frequencies.get(token.normalized);
    if (current) {
      current.count += 1;
    } else {
      frequencies.set(token.normalized, {
        word: token.word,
        count: 1,
        firstSeen: frequencies.size,
      });
    }
  }

  return [...frequencies.entries()]
    .sort(
      ([, left], [, right]) =>
        right.count - left.count || left.firstSeen - right.firstSeen,
    )
    .slice(0, 12)
    .map(([normalized, data]) => ({
      term: data.word,
      normalized,
      count: data.count,
    }));
}

function findSourceSentence(term, sentences) {
  const normalizedTerm = term.toLocaleLowerCase();
  return (
    sentences.find((sentence) =>
      sentence.toLocaleLowerCase().includes(normalizedTerm),
    ) || sentences[0] || term
  );
}

function addConcept(conceptsByTerm, termValue, details) {
  const term = cleanTerm(termValue);
  if (!term) {
    return;
  }

  const key = term.toLocaleLowerCase();
  const existing = conceptsByTerm.get(key);
  if (!existing) {
    conceptsByTerm.set(key, {
      term,
      definition: details.definition || "",
      sourceSentence: details.sourceSentence || "",
      sourceKind: details.sourceKind,
      keywordScore: details.keywordScore || 0,
    });
    return;
  }

  if (
    details.sourceKind === "definition" &&
    existing.sourceKind !== "definition"
  ) {
    existing.term = term;
    existing.definition = details.definition;
    existing.sourceSentence = details.sourceSentence;
    existing.sourceKind = "definition";
  } else if (!existing.definition && details.definition) {
    existing.definition = details.definition;
    existing.sourceSentence = details.sourceSentence;
  }
  existing.keywordScore = Math.max(
    existing.keywordScore,
    details.keywordScore || 0,
  );
}

function truncate(text, maxLength = 220) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength - 1).trimEnd()}…`;
}

function createFlashcards(concepts) {
  const cardConcepts = concepts.slice(0, 10);
  const cards = [];
  const seenFronts = new Set();
  const targetCount = Math.max(6, Math.min(10, cardConcepts.length));

  function addCard(front, back) {
    const key = front.toLocaleLowerCase().replace(/\s+/g, " ").trim();
    if (!front || !back || seenFronts.has(key) || cards.length >= 10) {
      return;
    }
    seenFronts.add(key);
    cards.push({ front, back });
  }

  for (const concept of cardConcepts) {
    if (concept.sourceKind === "definition") {
      addCard(`What is ${concept.term}?`, concept.definition);
    } else {
      addCard(
        `Which key term is highlighted in this note: "${truncate(concept.sourceSentence)}"?`,
        concept.term,
      );
    }
  }

  const variations = [
    (concept) => ({
      front: `How do the notes describe ${concept.term}?`,
      back: concept.definition,
    }),
    (concept) => ({
      front: `Which concept matches this description: "${truncate(concept.definition)}"?`,
      back: concept.term,
    }),
    (concept) => ({
      front: `What should you recall about ${concept.term}?`,
      back: concept.definition,
    }),
    (concept) => ({
      front: `Complete the key idea about ${concept.term}: "${truncate(concept.definition)}"`,
      back: concept.definition,
    }),
  ];

  let variationIndex = 0;
  while (cards.length < targetCount) {
    const concept = cardConcepts[variationIndex % cardConcepts.length];
    const variation =
      variations[Math.floor(variationIndex / cardConcepts.length) % variations.length];
    const card = variation(concept);
    addCard(card.front, card.back);
    variationIndex += 1;
  }

  return cards;
}

function createQuizQuestions(concepts) {
  return Array.from({ length: 5 }, (_, questionIndex) => {
    const concept = concepts[questionIndex % concepts.length];
    const distractors = concepts
      .filter(
        (candidate) =>
          candidate.term.toLocaleLowerCase() !== concept.term.toLocaleLowerCase(),
      )
      .slice(0, 3)
      .map((candidate) => candidate.term);
    const correctAnswer = (questionIndex * 3) % 4;
    const options = [];
    let distractorIndex = 0;

    for (let optionIndex = 0; optionIndex < 4; optionIndex += 1) {
      options.push(
        optionIndex === correctAnswer
          ? concept.term
          : distractors[distractorIndex++],
      );
    }

    return {
      question: `Which concept is described here: "${truncate(concept.definition)}"?`,
      options,
      correctAnswer,
      topic: concept.term,
    };
  });
}

export function extractConceptsAndCards(title, rawContent) {
  if (typeof title !== "string" || typeof rawContent !== "string") {
    throw new TypeError("title and rawContent must be strings.");
  }
  if (!title.trim() || !rawContent.trim()) {
    throw new RangeError("title and rawContent must not be empty.");
  }

  const sentences = splitSentences(rawContent);
  const conceptsByTerm = new Map();

  for (const sentence of sentences) {
    const definition = findDefinition(sentence);
    if (definition) {
      addConcept(conceptsByTerm, definition.term, {
        ...definition,
        sourceSentence: sentence,
        sourceKind: "definition",
      });
    }
  }

  const sourceText = `${title}\n${rawContent}`;
  for (const match of sourceText.matchAll(CAPITALIZED_TERM_PATTERN)) {
    const term = cleanTerm(match[0]);
    if (!term || STOP_WORDS.has(term.toLocaleLowerCase())) {
      continue;
    }
    addConcept(conceptsByTerm, term, {
      definition: "",
      sourceSentence: findSourceSentence(term, sentences),
      sourceKind: "capitalized",
    });
  }

  const keywordEntries = extractTopKeywords(rawContent);
  for (const keyword of keywordEntries) {
    addConcept(conceptsByTerm, keyword.term, {
      definition: "",
      sourceSentence: findSourceSentence(keyword.term, sentences),
      sourceKind: "keyword",
      keywordScore: keyword.count,
    });
  }

  const concepts = [...conceptsByTerm.values()]
    .slice(0, 20)
    .map((concept) => ({
      ...concept,
      definition: concept.definition || concept.sourceSentence || concept.term,
    }));

  if (concepts.length < MIN_QUIZ_CONCEPTS) {
    throw new RangeError(
      "Add more detailed notes with at least four distinct concepts to create a quiz.",
    );
  }

  return {
    extractedConcepts: concepts.map(
      ({ term, definition, sourceSentence, keywordScore }) => ({
        term,
        definition,
        sourceSentence,
        keywordScore,
      }),
    ),
    keywords: keywordEntries.map(({ term, count }) => ({ term, count })),
    flashcards: createFlashcards(concepts),
    quizQuestions: createQuizQuestions(concepts),
  };
}

function getWeakTopicDetails(weakTopic) {
  if (typeof weakTopic === "string" && weakTopic.trim()) {
    return { topic: weakTopic.trim(), accuracy: 50 };
  }
  if (!weakTopic || typeof weakTopic !== "object") {
    return null;
  }

  const topic =
    typeof weakTopic.topic === "string" ? weakTopic.topic.trim() : "";
  if (!topic) {
    return null;
  }

  let accuracy = Number(weakTopic.accuracy);
  if (!Number.isFinite(accuracy)) {
    const total = Number(weakTopic.totalQuestions);
    const incorrect = Number(weakTopic.incorrectAnswers);
    accuracy =
      Number.isFinite(total) && total > 0 && Number.isFinite(incorrect)
        ? ((total - incorrect) / total) * 100
        : 50;
  }

  return {
    topic,
    accuracy: Math.max(0, Math.min(100, accuracy)),
  };
}

function getMaterialConcepts(extractedConcepts) {
  if (Array.isArray(extractedConcepts)) {
    return extractedConcepts;
  }
  if (
    extractedConcepts &&
    typeof extractedConcepts === "object" &&
    Array.isArray(extractedConcepts.concepts)
  ) {
    return extractedConcepts.concepts;
  }
  return [];
}

function inferFlashcardTopic(flashcard) {
  if (typeof flashcard.topic === "string" && flashcard.topic.trim()) {
    return flashcard.topic.trim();
  }

  const concepts = getMaterialConcepts(flashcard.material?.extractedConcepts)
    .map((concept) =>
      typeof concept === "string" ? concept : concept?.term,
    )
    .filter((term) => typeof term === "string" && term.trim())
    .sort((left, right) => right.length - left.length);
  const backText =
    typeof flashcard.back === "string" ? flashcard.back.trim() : "";
  const exactBackConcept = concepts.find(
    (term) => term.toLocaleLowerCase() === backText.toLocaleLowerCase(),
  );
  if (exactBackConcept) {
    return exactBackConcept.trim();
  }

  const promptMatch = flashcard.front?.match(
    /^(?:what is|how do the notes describe|what should you recall about)\s+(.+?)(?:\?|:|$)/i,
  );
  if (promptMatch?.[1]) {
    return promptMatch[1].replace(/["“”]/g, "").trim();
  }

  const cardText = `${flashcard.front || ""} ${flashcard.back || ""}`;
  const matchingConcept = concepts.find((term) =>
    cardText.toLocaleLowerCase().includes(term.toLocaleLowerCase()),
  );
  if (matchingConcept) {
    return matchingConcept.trim();
  }

  return "Difficult flashcards";
}

export function buildAdaptiveStudyPath(quizAttempts, flashcards) {
  const topicStats = new Map();

  for (const [attemptIndex, attempt] of (Array.isArray(quizAttempts)
    ? quizAttempts
    : []
  ).entries()) {
    const recencyWeight = Math.pow(0.75, attemptIndex);
    const weakTopics = Array.isArray(attempt?.weakTopics)
      ? attempt.weakTopics
      : [];

    for (const weakTopic of weakTopics) {
      const detail = getWeakTopicDetails(weakTopic);
      if (!detail) {
        continue;
      }

      const stats = topicStats.get(detail.topic) || {
        weightedAccuracy: 0,
        totalWeight: 0,
        weakAttempts: 0,
        flashcards: 0,
        easeTotal: 0,
      };
      stats.weightedAccuracy += detail.accuracy * recencyWeight;
      stats.totalWeight += recencyWeight;
      stats.weakAttempts += recencyWeight;
      topicStats.set(detail.topic, stats);
    }
  }

  for (const flashcard of Array.isArray(flashcards) ? flashcards : []) {
    const easeFactor = Number(flashcard?.easeFactor);
    if (!Number.isFinite(easeFactor) || easeFactor >= LOW_EASE_THRESHOLD) {
      continue;
    }

    const topic = inferFlashcardTopic(flashcard);
    const stats = topicStats.get(topic) || {
      weightedAccuracy: 0,
      totalWeight: 0,
      weakAttempts: 0,
      flashcards: 0,
      easeTotal: 0,
    };
    stats.flashcards += 1;
    stats.easeTotal += easeFactor;
    topicStats.set(topic, stats);
  }

  return [...topicStats.entries()]
    .map(([topic, stats]) => {
      const quizMastery =
        stats.totalWeight > 0
          ? stats.weightedAccuracy / stats.totalWeight
          : null;
      const averageEase =
        stats.flashcards > 0 ? stats.easeTotal / stats.flashcards : null;
      const flashcardMastery =
        averageEase === null
          ? null
          : Math.max(
              0,
              Math.min(
                100,
                ((averageEase - 1.3) / (2.5 - 1.3)) * 100,
              ),
            );
      const masteryValues = [
        ...(quizMastery === null ? [] : [quizMastery]),
        ...(flashcardMastery === null ? [] : [flashcardMastery]),
      ];
      const mastery = Math.round(
        masteryValues.reduce((sum, value) => sum + value, 0) /
          masteryValues.length,
      );
      const priorityScore =
        100 -
        mastery +
        Math.min(15, Math.max(0, stats.weakAttempts - 1) * 5) +
        Math.min(15, Math.max(0, stats.flashcards - 1) * 3);
      const reasons = [];

      if (quizMastery !== null) {
        reasons.push(
          `Recent quiz accuracy is ${Math.round(quizMastery)}% across ${Math.max(1, Math.round(stats.weakAttempts))} attempt(s).`,
        );
      }
      if (stats.flashcards > 0) {
        reasons.push(
          `${stats.flashcards} related flashcard(s) have ease factors below ${LOW_EASE_THRESHOLD}.`,
        );
      }

      let action;
      if (quizMastery !== null && stats.flashcards > 0) {
        action = `Review the core idea for ${topic}, then retry its difficult flashcards before taking another quiz.`;
      } else if (quizMastery !== null) {
        action = `Revisit the key definitions for ${topic}, then answer a few practice questions.`;
      } else {
        action = `Review the notes for ${topic}, recall the answer before flipping each card, and rate it again.`;
      }

      return {
        topic,
        mastery,
        priorityScore,
        reason: reasons.join(" "),
        action,
      };
    })
    .sort(
      (left, right) =>
        right.priorityScore - left.priorityScore ||
        left.mastery - right.mastery ||
        left.topic.localeCompare(right.topic),
    )
    .slice(0, 10)
    .map(({ priorityScore, ...topic }, index) => ({
      ...topic,
      priority: index + 1,
    }));
}
