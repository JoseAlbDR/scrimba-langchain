import { PrismaVectorStore } from '@langchain/community/vectorstores/prisma';
import { prisma } from './data/prisma';
import { Prisma, Project } from '@prisma/client';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs/promises';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PromptTemplate } from '@langchain/core/prompts';
// import { StringOutputParser } from 'langchain/schema/output_parser';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { retriever } from './utils/retriever';
import { Document } from 'langchain/document';
import { combineDocuments } from './utils/combineDocuments';
import {
  RunnableSequence,
  RunnablePassthrough,
} from '@langchain/core/runnables';

(async () => {
  await document();
  // await main();
  // await RunSeq();
})();

async function document() {
  try {
    //* Read File and Split
    // const filePath = path.resolve(__dirname, 'scrimba.txt');
    // const text = await fs.readFile(filePath, 'utf-8');

    // const splitter = new RecursiveCharacterTextSplitter({
    //   chunkSize: 500,
    //   chunkOverlap: 50,
    // });

    // const output = await splitter.createDocuments([text]);

    // console.log({ output });

    //* Store output in a prisma vector store
    // const vectorStore = PrismaVectorStore.withModel<Document>(prisma).create(
    //   new OpenAIEmbeddings({
    //     openAIApiKey: process.env.OPENAI_API_KEY,
    //   }),
    //   {
    //     prisma: Prisma,
    //     tableName: 'Document',
    //     vectorColumnName: 'vector',
    //     columns: {
    //       id: PrismaVectorStore.IdColumn,
    //       content: PrismaVectorStore.ContentColumn,
    //     },
    //   }
    // );

    // await vectorStore.addModels(
    //   await prisma.$transaction(
    //     output.map((chunk) =>
    //       prisma.document.create({
    //         data: {
    //           content: chunk.pageContent,
    //         },
    //       })
    //     )
    //   )
    // );

    // console.log({ vectorStore });¨

    //* Embeddings
    // const embeddings = new OpenAIEmbeddings({
    //   openAIApiKey: process.env.OPENAI_API_KEY,
    // });

    // //* Vector store for user question embeddings
    // const vectorStore = new PrismaVectorStore(embeddings, {
    //   db: prisma,
    //   prisma: Prisma,
    //   tableName: 'Document',
    //   vectorColumnName: 'vector',
    //   columns: {
    //     id: PrismaVectorStore.IdColumn,
    //     content: PrismaVectorStore.ContentColumn,
    //   },
    // });
    //* Convert an user question in a standalone question
    //* Model
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.5,
      maxTokens: 500,
    });

    //* Template for stand alone question
    const standAloneTemplate = `Given a question, convert it to a standalone question. 
      question: {question} 
      standalone question:`;

    //* Prompt for stand alone question template
    const standAlonePrompt = PromptTemplate.fromTemplate(standAloneTemplate);

    //* Output Parser to return a string instead of an object
    const stringParser = new StringOutputParser();

    //* Final question
    const question = `Im a 40 year old man that is new to web development, just trying to take some curses and improve my skills while I learn more technologies and apply them to my projects but i don't know if I'm too old to learn from Scrimba and I don't know if Scrimba will help me to find job, do it give any kind of certifications that will help to find job and what are their cost?`;

    //* 1) Create the template
    const answerTemplate = `You are a helpful and enthusiastic support bot who can answer a given question about Scrimba based on the context provided. Try to find the answer in the context. If you really dont know the answer, say "Im sorry, I dont know the answer to that." And direct the questioner to email help@scrimba.com. Dont try to make up an answer. Always speak as if you were chatting to a friend.
      context: {context}
      question: {question}
      answer:`;

    //* 2) Create the prompt
    const answerPrompt = PromptTemplate.fromTemplate(answerTemplate);

    const promptChain = standAlonePrompt
      .pipe(llm) // Pass prompt to Model, returns an object
      .pipe(stringParser) // Convert that object in a string (the stand alone question)
      .pipe(retriever) // Find machs in vector store from retriever, returns an object
      .pipe(combineDocuments); // Return possible matches but in a string format

    const answerChain = answerPrompt.pipe(llm).pipe(stringParser);

    //* 3) Create/Add to the chain with pipes
    const chain = RunnableSequence.from([
      {
        context: promptChain,
        question: (params) => params.question,
      },
      answerChain,
    ]);

    //* 4) Invoke the chain with needed arguments
    const answerResponse = await chain.invoke({
      question,
    });

    console.log({ answerResponse });
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
