import type { PrimitiveType, ResolvedConfig } from '../config.ts';

export interface ComponentApproval { module: string; export: string; reason: string }
export interface CheckException { file: string; rule: string; source: string; reason: string; line?: number; column?: number }
export interface ChecksConfig {
  source_roots: string[];
  tsconfig?: string;
  excluded_projects?: { name: string; reason: string }[];
  approved_components: ComponentApproval[];
  exceptions: CheckException[];
}
export interface SourceDiagnostic {
  file: string;
  line: number;
  column: number;
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  suggestion: string;
  source: string;
  exception?: string;
}
export interface SourceReport {
  status: 'not_configured' | 'passed' | 'warnings' | 'failed';
  valid: boolean;
  files: number;
  checked: number;
  diagnostics: SourceDiagnostic[];
  source_roots?: string[];
  existing_diagnostics?: SourceDiagnostic[];
  excluded_projects?: { name: string; source_root: string; reason: string }[];
  exceptions: SourceDiagnostic[];
}
export interface AngularDeclaration {
  file: string;
  name: string;
  selector: string;
  kind: 'component' | 'directive';
}
export interface SourcePolicy {
  schema_version: 1;
  configuration_hash: string;
  semantic: Record<string, { category: string; type: PrimitiveType }>;
  generated_components: AngularDeclaration[];
  checks?: ChecksConfig;
}
export interface SourceLocation { file: string; text: string; offset: number }
export type UtilityResolver = ((candidate: string) => [string, string][] | undefined) & {
  variantThresholds: (variant: string) => string[];
  /** True only when a single-word prefix cannot enter pinned or fallback utility grammar. */
  disjointClassPrefix?: (prefix: string) => boolean;
};
/** Owner-local evidence produced by the source scanner, never a property allowlist.
 * complete requires every matching consumer to have an unconditional producer,
 * every reachable writer to have a closed value set, and no unscoped writer.
 * The scanner must not share records across component stylesheet owners.
 */
export interface ScopedCustomProperty {
  name: string;
  selector: string;
  values: readonly string[];
  complete: boolean;
  /** Candidate strings may include incomplete dynamic expression fragments. */
  fragments?: boolean;
  /** Complete string candidates among values; this does not prove writer coverage. */
  wholeValues?: readonly string[];
  /** Known CSS tag/class/id anchors on one native subject, not shared sibling facts. */
  subjectSelectors?: readonly string[];
  /** Inspect possible candidates using necessary terminal facts even for an uncertain selector; never expands coverage. */
  partialSubject?: boolean;
  /** Class bindings may change class anchors; the element tag is still fixed. */
  subjectClassesUnknown?: boolean;
  /** Id bindings may change id anchors independently of classes. */
  subjectIdUnknown?: boolean;
  subjectOptionalSelectors?: readonly string[];
  /** A possible template ancestor value, not an own writer or a coverage proof. */
  inherited?: boolean;
  /** Parent-template/coapplied values already represented on the receiving native
   * node. Own peer lookup excludes them; dependency lookup retains them. */
  incomingHost?: boolean;
  /** Ephemeral identity of the actual template node, retained through alias recursion. */
  subjectId?: object;
  /** Receiving application, distinct from a template node reused by instances. */
  applicationId?: object;
  /** Expressions retain their compute origin across inheritance. Host origins
   * deliberately have no native subjectId; undefined must not borrow a child. */
  origin?: CustomPropertyOrigin;
}
/** Candidate-only source traversal. Resolvers keep their own stylesheet owner
 * and computed element; inherited expressions must not borrow the receiver. */
export type CustomPropertyResolver = (name: string) => {
  complete: boolean;
  candidates: { value: string; resolve: CustomPropertyResolver; fragments?: boolean }[];
};
export interface CustomPropertyOrigin {
  subjectId?: object;
  applicationId?: object;
  selectors: readonly string[];
  host?: boolean;
  subjectClassesUnknown?: boolean;
  subjectIdUnknown?: boolean;
  subjectOptionalSelectors?: readonly string[];
  /** Actual rendered native ancestors in the same receiving application.
   * Alternative selector facts stay separate; these never prove coverage. */
  nativeAncestors?: readonly CustomPropertyOrigin[];
  /** Corresponding alternatives on both views of one physical component host.
   * Class branch identity comes from its shared selector binding state. */
  classBranch?: object;
  idBranch?: string;
  /** Exclusive HostBinding key choice, retained even when class values are unknown. */
  keyBranch?: object;
  /** Embedded views may be instantiated outside the declaring component host. */
  hostDetached?: boolean;
  /** Proven document selector reachability; undefined keeps placement unknown. */
  documentStyles?: boolean;
  /** Proven Angular SharedStylesHost reachability; unsupported renderers stay unknown. */
  sharedStyles?: boolean;
  /** A parent relation was not explored (budget, depth or recursive graph). */
  untrackedSupply?: boolean;
  /** Parent-template supply on this actual component host. */
  supply?: CustomPropertyResolver;
  /** A component's own host layer on this same physical native element.
   * Top-level lookup excludes incoming supply; dependency resolvers include it. */
  sameHost?: CustomPropertyResolver;
}
export interface StyleContext {
  policy: SourcePolicy;
  emit: (diagnostic: SourceDiagnostic) => void;
  checked: () => void;
  /** Keep distinct concrete values when dynamic candidates need individual exception matching. */
  separateLiteralValues?: boolean;
  utilities?: UtilityResolver;
  componentStyles?: boolean;
  customPropertyWrites?: ReadonlySet<string> | 'unknown';
  customPropertyValues?: ReadonlyMap<string, readonly string[]>;
  registeredCustomProperties?: ReadonlySet<string>;
  scopedCustomProperties?: readonly ScopedCustomProperty[];
  hostSubjects?: readonly CustomPropertyOrigin[];
  /** Host queries retained for this stylesheet's consumers. Other host facts
   * can identify reachable native children without being consumer queries. */
  hostConsumers?: ReadonlySet<CustomPropertyOrigin>;
  nativeSubjects?: readonly CustomPropertyOrigin[];
  /** Inherited candidates computed at this native subject's owning host. Foreign
   * stylesheets retain the original owner/application dependency resolvers. */
  hostInheritance?: ReadonlyMap<CustomPropertyOrigin, CustomPropertyResolver>;
  /** Other stylesheet units of this same Angular owner. Candidate writers only;
   * they never establish closed coverage or select a cascade winner. */
  siblingStyles?: readonly { css: string; scss: boolean }[];
}
export interface SourceCheckMode {
  requireSourceChecks?: boolean;
  baselinePath?: string;
}
export interface CheckSourcesOptions extends SourceCheckMode { root: string; config: ResolvedConfig; policy: SourcePolicy }
