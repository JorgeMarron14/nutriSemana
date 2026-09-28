require('dotenv').config();

module.exports = {
  apiKey: process.env.ANTHROPIC_API_KEY,
  dietParsingModel: process.env.CLAUDE_DIET_PARSING_MODEL || 'claude-sonnet-5',
  chatModel: process.env.CLAUDE_CHAT_MODEL || 'claude-haiku-4-5-20251001',
  ingredientModel: process.env.CLAUDE_INGREDIENT_MODEL || 'claude-haiku-4-5-20251001',
};
