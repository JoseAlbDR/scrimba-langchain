"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("@langchain/community/vectorstores/prisma");
const prisma_2 = require("./data/prisma");
const client_1 = require("@prisma/client");
const openai_1 = require("@langchain/openai");
require("dotenv/config");
const prompts_1 = require("@langchain/core/prompts");
// import { StringOutputParser } from 'langchain/schema/output_parser';
const output_parsers_1 = require("@langchain/core/output_parsers");
const retriever_1 = require("./utils/retriever");
const combineDocuments_1 = require("./utils/combineDocuments");
const runnables_1 = require("@langchain/core/runnables");
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
        const llm = new openai_1.ChatOpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY,
            temperature: 0.5,
            maxTokens: 500,
        });
        const passThrough = new runnables_1.RunnablePassthrough();
        //* Retriever (refactor to utils/retriever.ts)
        // const retriever = vectorStore.asRetriever();
        const standAloneTemplate = `Given a question, convert it to a standalone question. 
      question: {question} 
      standalone question:`;
        //* Prompt for template
        const standAlonePrompt = prompts_1.PromptTemplate.fromTemplate(standAloneTemplate);
        //* Output Parser
        const stringParser = new output_parsers_1.StringOutputParser();
        const question = 
        // 'What are the technical requirements for running Scrimba? I only have a very old laptop which is not that powerful';
        `Im a 40 year old man that is new to web development, just trying to take some curses and improve my skills while I learn more technologies and apply them to my projects, I don't know if Scrimba will help me to find job, do it give any kind of certifications that will help to find job and what are their cost?`;
        //* Invoke chain
        // const response = await chain.invoke({
        //   question,
        // });
        // console.log({ response });
        //* 1) Create the template
        const answerTemplate = `You are a helpful and enthusiastic support bot who can answer a given question about Scrimba based on the context provided. Try to find the answer in the context. If you really dont know the answer, say "Im sorry, I dont know the answer to that." And direct the questioner to email help@scrimba.com. Dont try to make up an answer. Always speak as if you were chatting to a friend.
      context: {context}
      question: {question}
      answer:`;
        //* 2) Create the prompt
        const answerPrompt = prompts_1.PromptTemplate.fromTemplate(answerTemplate);
        const promptChain = standAlonePrompt
            .pipe(llm) // Pass prompt to Model, returns an object
            .pipe(stringParser) // Convert that object in a string
            .pipe(retriever_1.retriever) // Find matchs in vector store from retriever, returns an object
            .pipe(combineDocuments_1.combineDocuments); // Return possible matches
        const answerChain = answerPrompt.pipe(llm).pipe(stringParser);
        //* 3) Create/Add to the chain with pipes
        const chain = runnables_1.RunnableSequence.from([
            {
                context: promptChain,
                question: (passThrough) => passThrough.question,
            },
            answerChain,
        ]);
        const promptResponse = await promptChain.invoke({
            question,
        });
        console.log({ promptResponse });
        //* 4) Invoke the chain with needed arguments
        const answerResponse = await chain.invoke({
            question,
        });
        console.log({ answerResponse });
    }
    catch (error) {
        console.log(error);
    }
}
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
async function main() {
    const vectorStore = prisma_1.PrismaVectorStore.withModel(prisma_2.prisma).create(new openai_1.OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
    }), {
        prisma: client_1.Prisma,
        tableName: 'Project',
        vectorColumnName: 'vector',
        columns: {
            id: prisma_1.PrismaVectorStore.IdColumn,
            description: prisma_1.PrismaVectorStore.ContentColumn,
            title: prisma_1.PrismaVectorStore.ContentColumn,
        },
    });
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
    await vectorStore.addModels(await prisma_2.prisma.$transaction(projects.map((project) => prisma_2.prisma.project.create({
        data: {
            title: project.title,
            description: project.description,
            image: 'default',
        },
    }))));
    const resultOne = await vectorStore.similaritySearch('Nodepop');
    console.log({ resultOne });
    console.log(resultOne[0].metadata);
}
