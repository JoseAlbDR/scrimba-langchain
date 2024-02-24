import { ChatOpenAI } from '@langchain/openai';
import 'dotenv/config';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import {
  RunnableSequence,
  RunnablePassthrough,
} from '@langchain/core/runnables';

async function RunSeq() {
  const llm = new ChatOpenAI();
  const stringParser = new StringOutputParser();
  const passThrough = new RunnablePassthrough();

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
  const punctuationPrompt = PromptTemplate.fromTemplate(punctuationTemplate);
  const grammarPrompt = PromptTemplate.fromTemplate(grammarTemplate);
  const translationPrompt = PromptTemplate.fromTemplate(translationTemplate);

  //* Chains
  const punctuationChain = punctuationPrompt.pipe(llm).pipe(stringParser);
  const grammarChain = grammarPrompt.pipe(llm).pipe(stringParser);
  const translationChain = translationPrompt.pipe(llm).pipe(stringParser);

  //* Runnable Sequence
  const chain = RunnableSequence.from([
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
