export function verifyEnglishDocumentation(packageRoot: string, generatedSkillRoot?: string): Promise<{ pairedDocuments: number; englishDocumentsChecked: number }>;

export function verifyReleaseVersionDocumentation(packageRoot: string): Promise<void>;
