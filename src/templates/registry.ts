import type { GraphTemplateDefinition, TemplateRegistry } from "./graphTypes.js";

export function createTemplateRegistry(initialTemplates: readonly GraphTemplateDefinition<any, string>[] = []): TemplateRegistry {
  const templates = new Map<string, GraphTemplateDefinition<any, string>>();

  for (const template of initialTemplates) {
    templates.set(template.modelId, template);
  }

  return {
    register(template) {
      templates.set(template.modelId, template);
    },

    get(templateId) {
      return templates.get(templateId);
    },

    list() {
      return [...templates.values()];
    },

    summaries() {
      return [...templates.values()].map(template => template.summary());
    }
  };
}
