import { readFile, writeFile } from 'node:fs/promises';
import { parse, parseDocument } from 'yaml';
import { parseConfig, type FoundationConfig, type Profile } from '../src/config.ts';

type StarterTranslation = {
  context: FoundationConfig['context'];
  profiles: Record<string, Pick<Profile, 'label' | 'context' | 'guidance'>>;
};

const readExample = (name: string) => readFile(new URL(`../examples/${name}`, import.meta.url), 'utf8');
const source = await readExample('ui.config.repository.yaml');
const config = parseConfig(source);
const translation: StarterTranslation = parse(await readExample('ui.config.example.en-text.yaml'));
const profileIds = Object.keys(config.profiles);
if (Object.keys(translation.profiles).length !== profileIds.length ||
    profileIds.some(id => !Object.hasOwn(translation.profiles, id))) {
  throw new Error('English starter text must cover the repository profiles.');
}

for (const [name, language] of [
  ['ui.config.example.yaml', 'ja'],
  ['ui.config.example.en.yaml', 'en'],
] as const) {
  const example = parseDocument(source.replace(/^(?:#[^\n]*\n)+/, ''));
  example.commentBefore = language === 'ja'
    ? ' 利用アプリ向けの設定例。自分のアプリの ui.config.yaml を編集してください。\n context/guidance は画面設計の判断材料です。CLI は文章から値を推測しません。'
    : ' Starter configuration. Edit your app’s ui.config.yaml.\n Context and guidance inform screen design. The CLI does not infer token values from prose.';
  example.set('checks', { source_roots: ['src'], approved_components: [], exceptions: [] });
  example.set('default_language', language);
  if (language === 'en') {
    example.set('context', translation.context);
    for (const id of profileIds) {
      const { label, context, guidance } = translation.profiles[id];
      example.setIn(['profiles', id, 'label'], label);
      example.setIn(['profiles', id, 'context'], context);
      example.setIn(['profiles', id, 'guidance'], guidance);
    }
  }
  const output = example.toString();
  parseConfig(output);
  const file = new URL(`../examples/${name}`, import.meta.url);
  if (process.argv.includes('--check')) {
    if (await readFile(file, 'utf8') === output) continue;
    console.error(`${name} is out of date. Run npm run config:examples.`);
    process.exitCode = 1;
  } else {
    await writeFile(file, output);
  }
}
