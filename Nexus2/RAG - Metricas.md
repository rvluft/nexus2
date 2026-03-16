Aqui vai um guia dev completo sobre métricas de avaliação para RAG, focado em automação com RAGAS (biblioteca padrão para isso). Inclui definição, por que importa, thresholds, código pronto para rodar e como criar datasets de teste. Use isso em CI/CD para monitorar regressões. [docs.ragas](https://docs.ragas.io/en/latest/concepts/metrics/available_metrics/faithfulness/)

Métricas se dividem em **Retrieval** (qualidade do contexto), **Generation** (qualidade da resposta) e **End-to-End** (alinhamento query-resposta). [confident-ai](https://www.confident-ai.com/blog/rag-evaluation-metrics-answer-relevancy-faithfulness-and-more)

## Métricas principais (RAGAS)

| Métrica              | O que mede                                                                 | Input necessário                  | Threshold OK | Ação se baixo |
|----------------------|----------------------------------------------------------------------------|-----------------------------------|--------------|---------------|
| **Context Precision**| Ordem dos chunks: relevantes no top? (penaliza irrelevantes acima). [developer.couchbase](https://developer.couchbase.com/tutorial-evaluate-rag-responses-using-ragas/) | question, contexts, ground_truth | >0.85       | Rerank/filtros metadata |
| **Context Recall**   | Contexto tem TODA info da ground_truth? (recall dos facts). [docs.ragas](https://docs.ragas.io/en/latest/concepts/metrics/available_metrics/faithfulness/)| question, contexts, ground_truth | >0.75       | Chunking maior/melhor embedding |
| **Faithfulness**     | Resposta factual ao contexto? (detecta alucinações). [docs.ragas](https://docs.ragas.io/en/latest/concepts/metrics/available_metrics/faithfulness/)      | answer, contexts                 | >0.90       | Prompt grounding + LLM melhor |
| **Answer Relevancy** | Resposta responde à query? (sem drift/irrelevância). [confident-ai](https://www.confident-ai.com/blog/rag-evaluation-metrics-answer-relevancy-faithfulness-and-more)              | question, answer                 | >0.85       | Query rewrite + prompt claro |
| **Context Relevancy**| Chunks relevantes à query? (penaliza ruído no retrieval). [confident-ai](https://www.confident-ai.com/blog/rag-evaluation-metrics-answer-relevancy-faithfulness-and-more)         | question, contexts               | >0.90       | Híbrido retrieval + top-k menor |

**Score médio >0.85**: RAG pronto para prod. <0.7: refatore retrieval primeiro (causa raiz de 80% dos problemas). [developer.couchbase](https://developer.couchbase.com/tutorial-evaluate-rag-responses-using-ragas/)

## Como funciona (exemplo Faithfulness)

RAGAS usa LLM-judge (ex: GPT-4o-mini) para quebrar answer em claims → verifica se cada claim é suportado explicitamente pelo contexto. Score = claims suportados / total claims. Ex: Answer menciona "Tesla fundada em 2003" mas contexto diz "2003" → OK; se inventa "por Elon sozinho" → penaliza. [youtube](https://www.youtube.com/watch?v=7_LTU0LA374)

## 1. Setup RAGAS (Python)

```bash
pip install ragas datasets langchain-openai
```
Sete `OPENAI_API_KEY` ou use Anthropic/Claude. [superlinked](https://superlinked.com/vectorhub/articles/retrieval-augmented-generation-eval-qdrant-ragas)

## 2. Crie dataset de avaliação

Precisa de 50-200 samples: `{question, contexts (lista chunks), answer (do seu RAG), ground_truth (resposta ideal)}`.

**Dataset manual/simples:**
```python
test_data = {
    "question": ["Qual CPU usar no meu VPS?"],
    "contexts": [["Recomendamos AMD EPYC para workloads AI. Preço: R$0.50/h"]],
    "answer": ["Use AMD EPYC para AI, custa R$0.50/h"],  # output do seu RAG
    "ground_truth": ["AMD EPYC é ideal para AI workloads"]  # humano anotado
}
```

**Automático: rode seu RAG em dataset base (ex: HuggingFace Q&A):**
```python
from datasets import load_dataset
from ragas.testset.generator import TestsetGenerator
from ragas.testset.evolutions import rag_eval

generator = TestsetGenerator.with_openai()  # ou Claude
testset = generator.generate_with_langchain_docs(docs, test_size=50)
test_dataset = testset.to_pandas()  # pronto para eval
```
Ou: pegue dataset pronto como `atitaarora/qdrant_doc_qna` e rode seu retriever/chain. [docs.ragas](https://docs.ragas.io/en/stable/concepts/components/eval_dataset/)

## 3. Rode avaliação automatizada

```python
from ragas import evaluate
from ragas.metrics import (
    faithfulness, answer_relevancy, context_precision, context_recall
)
from datasets import Dataset

# seu dataset em dict/list
data_samples = {
    'question': [...],
    'answer': [...],
    'contexts': [...],
    'ground_truth': [...]
}
dataset = Dataset.from_dict(data_samples)

result = evaluate(
    dataset,
    metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
    llm="gpt-4o-mini"  # custo baixo
)
print(result)
# {'faithfulness': 0.92, 'answer_relevancy': 0.87, 'context_precision': 0.89, 'context_recall': 0.76}
```
**Output salva em JSON/CSV auto**. Rode isso após cada mudança (chunk size, embedding, etc.). [redis](https://redis.io/blog/get-better-rag-responses-with-ragas/)

## 4. Integração CI/CD + monitoring

- **GitHub Actions/Jenkins:** Rode eval em PRs; falhe se média <0.85.
- **n8n workflow:** Trigger webhook → rode RAG → RAGAS eval → Supabase insert scores → alert Slack se baixa.
- **Prod monitoring:** Log 10% queries reais → eval batch diário. Use LangSmith/Phoenix para trace full pipeline. [kinde](https://kinde.com/learn/ai-for-software-engineering/best-practice/rag-evaluation-in-practice-faithfulness-context-recall-answer-relevancy/)

**Exemplo thresholds por stage:**
```
Retrieval: Context Precision >0.9, Recall >0.8
Generation: Faithfulness >0.95
E2E: Answer Relevancy >0.9
```

## 5. Erros comuns e fixes

- **Context Recall baixo:** Aumente overlap chunk, use multi-query (rephrase query). [developer.couchbase](https://developer.couchbase.com/tutorial-evaluate-rag-responses-using-ragas/)
- **Faithfulness baixo:** Prompt "cite sources verbatim"; troque LLM por Claude Sonnet.
- **Sem ground_truth?** Use synthetic: LLM gera Q&A de seus docs.
- **Custo alto?** Use local LLM (Llama3) para eval ou sample 20% dataset. [cleanlab](https://cleanlab.ai/blog/rag-tlm-hallucination-benchmarking/)

RAGAS é gold standard (open-source, LLM-agnostic). Teste com seu dataset real e veja onde dói mais. Quer script full pra n8n/Supabase ou dataset sintético pro seu domínio (ex: real estate)?