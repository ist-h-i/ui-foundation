export function verifyEnglishDocumentation(packageRoot: string, generatedSkillRoot?: string): Promise<{ pairedDocuments: number; englishDocumentsChecked: number }>;

/** Verify generated Markdown and source examples; return Markdown paths for prose checking. */
export declare function verifySkillInstructionCopies(source: string, generated?: string): Promise<string[]>;
