export function verifyEnglishDocumentation(packageRoot: string, generatedSkillRoot?: string): Promise<{ pairedDocuments: number; englishDocumentsChecked: number }>;

export function verifyReleaseVersionDocumentation(packageRoot: string): Promise<void>;

/** Verify generated Markdown and source examples; return Markdown paths for prose checking. */
export function verifySkillInstructionCopies(source: string, generated?: string): Promise<string[]>;
