"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const openai_1 = require("@langchain/openai");
require("dotenv/config");
const prompts_1 = require("@langchain/core/prompts");
const output_parsers_1 = require("@langchain/core/output_parsers");
const runnables_1 = require("@langchain/core/runnables");
async function RunSeq() {
    const llm = new openai_1.ChatOpenAI();
    const stringParser = new output_parsers_1.StringOutputParser();
    const passThrough = new runnables_1.RunnablePassthrough();
    //* Templates
    const punctuationTemplate = `Given a sentence, add punctuation where needed.
  sentence: {sentence}
  sentence with punctuation:`;
    const grammarTemplate = `Given a sentence correct the grammar.
  sentence: {punctuated_sentence}
  sentence with correct grammar:`;
    const translationTemplate = `Given a sentence, translate that sentence into {language}
  sentence: {grammatically_correct_sentence}
  translated sentence:`;
    //* Prompts
    const punctuationPrompt = prompts_1.PromptTemplate.fromTemplate(punctuationTemplate);
    const grammarPrompt = prompts_1.PromptTemplate.fromTemplate(grammarTemplate);
    const translationPrompt = prompts_1.PromptTemplate.fromTemplate(translationTemplate);
    //* Chains
    const punctuationChain = punctuationPrompt.pipe(llm).pipe(stringParser);
    const grammarChain = grammarPrompt.pipe(llm).pipe(stringParser);
    const translationChain = translationPrompt.pipe(llm).pipe(stringParser);
    //* Runnable Sequence
    const chain = runnables_1.RunnableSequence.from([
        {
            punctuated_sentence: punctuationChain,
            original_input: passThrough, // passThrough => {sentence, language}
        },
        {
            grammatically_correct_sentence: grammarChain,
            language: ({ original_input }) => original_input.language,
        },
        translationChain,
    ]);
    const response = await chain.invoke({
        sentence: 'i dont liked mondays',
        language: 'spanish',
    });
    console.log(response);
}
