import { PrismaVectorStore } from '@langchain/community/vectorstores/prisma';
import { prisma } from './data/prisma';
import { Documents, Prisma, Project } from '@prisma/client';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs/promises';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { retriever } from './utils/retriever';
import { combineDocuments } from './utils/combineDocuments';
import {
  RunnableSequence,
  RunnablePassthrough,
} from '@langchain/core/runnables';

(async () => {
  await chatBot();

  // await main();
  // await RunSeq();
})();

async function chatBot() {
  try {
    // document.addEventListener('submit', (e) => {
    //   e.preventDefault();
    //   progressConversation();
    // });

    //* Read File and Split
    const filePath = path.resolve(__dirname, 'adoptaunpeludo.txt');
    const text = await fs.readFile(filePath, 'utf-8');

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });

    const output = await splitter.createDocuments([text]);

    console.log({ output });

    //* Store output in a prisma vector store
    const vectorStore = PrismaVectorStore.withModel<Documents>(prisma).create(
      new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
      }),
      {
        prisma: Prisma,
        tableName: 'Documents',
        vectorColumnName: 'vector',
        columns: {
          id: PrismaVectorStore.IdColumn,
          content: PrismaVectorStore.ContentColumn,
        },
      }
    );

    await vectorStore.addModels(
      await prisma.$transaction(
        output.map((chunk) =>
          prisma.documents.create({
            data: {
              content: chunk.pageContent,
            },
          })
        )
      )
    );

    //* Convert an user question in a standalone question
    //* Model
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.5,
      maxTokens: 500,
    });
    const passThrough = new RunnablePassthrough();

    //* Template for stand alone question
    const standAloneTemplate = `Given a question, convert it to a standalone question. 
      question: {question} 
      standalone question:`;

    //* Prompt for stand alone question template
    const standAlonePrompt = PromptTemplate.fromTemplate(standAloneTemplate);

    //* Output Parser to return a string instead of an object
    const stringParser = new StringOutputParser();

    //* Final question
    const question = `Hola, soy un refugio que no tiene página web propia y acabo de conocer esta plataforma pero no estoy muy seguro de como utilizarla, me podrías explicar los pasos que tengo que seguir para poner los animales que tengo en el refugio en adopcion? Gracias`;

    console.log({ question });

    //* 1) Create the template
    const answerTemplate = `You are a helpful and enthusiastic support bot who can answer a given question about Adoptaunpeludo based on the context provided. Try to find the answer in the context. If you really don't know the answer, say "I'm sorry, I don't know the answer to that." And direct the questioner to email adoptaunpeludo@gmail.com. Don't try to make up an answer. Always speak as if you were chatting to a friend.
      context: {context}
      question: {question}
      answer:`;

    //* 2) Create the prompt
    const answerPrompt = PromptTemplate.fromTemplate(answerTemplate);

    const standAloneQuestionChain = standAlonePrompt
      .pipe(llm) // Pass prompt to Model, returns an object
      .pipe(stringParser); // Convert that object in a string (the stand alone question)

    const retrieverChain = RunnableSequence.from([
      (prevResult) => prevResult.standaloneQuestion, // Prev result from RunnableSequece/Chain
      retriever, // Pass to retriever
      combineDocuments, // Convert all results to an string
    ]);

    const answerChain = answerPrompt.pipe(llm).pipe(stringParser);

    //* 3) Create/Add to the chain with pipes
    const chain = RunnableSequence.from([
      {
        standaloneQuestion: standAloneQuestionChain,
        originalQuestion: passThrough,
      },
      {
        context: retrieverChain,
        question: ({ originalQuestion }) => originalQuestion.question,
      },
      answerChain,
    ]);

    //* 4) Invoke the chain with needed arguments
    const answerResponse = await chain.invoke({
      question,
    });

    console.log({ answer: answerResponse });

    async function progressConversation() {
      const userInput = document.getElementById(
        'user-input'
      ) as HTMLInputElement;
      const chatbotConversation = document.getElementById(
        'chatbot-conversation-container'
      );

      if (!userInput) return;
      const question = userInput.value;
      userInput.value = '';

      // add human message
      const newHumanSpeechBubble = document.createElement('div');
      newHumanSpeechBubble.classList.add('speech', 'speech-human');

      if (!chatbotConversation) return;

      chatbotConversation.appendChild(newHumanSpeechBubble);
      newHumanSpeechBubble.textContent = question;
      chatbotConversation.scrollTop = chatbotConversation.scrollHeight;

      // add AI message
      const newAiSpeechBubble = document.createElement('div');
      newAiSpeechBubble.classList.add('speech', 'speech-ai');
      chatbotConversation.appendChild(newAiSpeechBubble);
      newAiSpeechBubble.textContent = answerResponse;
      chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
    }
  } catch (error) {
    console.log(error);
  }
}

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
async function main() {
  const vectorStore = PrismaVectorStore.withModel<Project>(prisma).create(
    new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    }),
    {
      prisma: Prisma,
      tableName: 'Project',
      vectorColumnName: 'vector',
      columns: {
        id: PrismaVectorStore.IdColumn,
        description: PrismaVectorStore.ContentColumn,
        title: PrismaVectorStore.ContentColumn,
      },
    }
  );

  const projects = [
    {
      title: 'Nodepop',
      description: 'FullStack Store done with a MERN stack',
    },
    {
      title: 'Portfolio',
      description: 'Personal Portfolio page done with MERN stack',
    },
  ];

  await vectorStore.addModels(
    await prisma.$transaction(
      projects.map((project) =>
        prisma.project.create({
          data: {
            title: project.title,
            description: project.description,
            image: 'default',
          },
        })
      )
    )
  );

  const resultOne = await vectorStore.similaritySearch('Nodepop');

  console.log({ resultOne });
  console.log(resultOne[0].metadata);
}
