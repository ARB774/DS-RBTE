import { retrieveMentorMethods } from '../lib/mentor-method-client';
import { valuePropositionStages } from '../lib/value-proposition-route';

async function main() {
  for (const stage of valuePropositionStages) {
    const sources = await retrieveMentorMethods(stage);
    console.log(`MCP ${stage}: ${sources.map(s => `${s.id}:${s.origin}`).join(', ')}`);
  }
  console.log('ALL STAGE SOURCES VERIFIED');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
