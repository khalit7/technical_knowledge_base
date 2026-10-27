"""Transcribe the paper's tables (arXiv HTML v4, https://arxiv.org/html/2005.11401v4) into tables.json, printed
precision kept. Values were read from inputs/table_*.txt and inputs/paper_v4.txt (extract_paper.py); Table 2's
FEVER cells span both RAG rows in the HTML (rowspan 2: the two models are the same for classification, §2.1).
  python3 mk_tables.py
"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
T = {}
T['t1'] = dict(id='S4.T2', name='Table 1: Open-domain QA, test exact match',
               cols=['NQ', 'TQA', 'TQA-Wiki', 'WQ', 'CT'],
               note='TQA is the standard open-domain test set (DPR splits); TQA-Wiki is the official Wikipedia test set that T5 used (Appendix D).',
               rows=[dict(m='T5-11B', g='Closed book', v=[34.5, None, 50.1, 37.4, None]),
                     dict(m='T5-11B+SSM', g='Closed book', v=[36.6, None, 60.5, 44.7, None]),
                     dict(m='REALM', g='Open book', v=[40.4, None, None, 40.7, 46.8]),
                     dict(m='DPR', g='Open book', v=[41.5, 57.9, None, 41.1, 50.6]),
                     dict(m='RAG-Token', g='RAG', v=[44.1, 55.2, 66.1, 45.5, 50.0]),
                     dict(m='RAG-Seq.', g='RAG', v=[44.5, 56.8, 68.0, 45.2, 52.2])])
T['t2'] = dict(id='S4.T2', name='Table 2: Generation and classification, test',
               cols=['Jeopardy B-1', 'Jeopardy QB-1', 'MS-MARCO R-L', 'MS-MARCO B-1', 'FEVER-3 acc', 'FEVER-2 acc'],
               note='* uses gold context or evidence. MS-MARCO SotA is Bi et al. [4], FEVER-3 is Zhou et al. [68], FEVER-2 is Thorne and Vlachos [57].',
               rows=[dict(m='SotA', v=[None, None, 49.8, 49.9, 76.8, 92.2], gold=[False, False, True, True, False, True]),
                     dict(m='BART', v=[15.1, 19.7, 38.2, 41.6, 64.0, 81.1]),
                     dict(m='RAG-Tok.', v=[17.3, 22.2, 40.1, 41.5, 72.5, 89.5]),
                     dict(m='RAG-Seq.', v=[14.7, 21.4, 40.8, 44.2, 72.5, 89.5], shared=[4, 5])])
T['t3'] = dict(id='S4.T3', name='Table 3: Example generations', rows=[
    dict(task='MS-MARCO', x='define middle ear', BART='?The middle ear is the part of the ear between the middle ear and the nose.',
         T='The middle ear is the portion of the ear internal to the eardrum.', S='The middle ear includes the tympanic cavity and the three ossicles.'),
    dict(task='MS-MARCO', x='what currency needed in scotland', BART='The currency needed in Scotland is Pound sterling.',
         T='Pound is the currency needed in Scotland.', S='The currency needed in Scotland is the pound sterling.'),
    dict(task='Jeopardy', x='Washington', BART='?This state has the largest number of counties in the U.S.',
         T='It’s the only U.S. state named for a U.S. president', S='It’s the state where you’ll find Mount Rainier National Park'),
    dict(task='Jeopardy', x='The Divine Comedy', BART='*This epic poem by Dante is divided into 3 parts: the Inferno, the Purgatorio & the Purgatorio',
         T='Dante’s "Inferno" is the first part of this epic poem', S='This 14th century work is divided into 3 sections: "Inferno", "Purgatorio" & "Paradiso"')],
    note='? marks a factually incorrect response, * a partially correct one.')
T['t4'] = dict(id='S4.T5', name='Table 4: Human assessments, Jeopardy question generation (452 pairs, BART against RAG-Token)',
               cols=['Factuality', 'Specificity'],
               rows=[dict(m='BART better', v=[7.1, 16.8]), dict(m='RAG better', v=[42.7, 37.4]), dict(m='Both good', v=[11.7, 11.8]),
                     dict(m='Both poor', v=[17.7, 6.9]), dict(m='No majority', v=[20.8, 20.1])])
T['t5'] = dict(id='S4.T5', name='Table 5: Ratio of distinct to total tri-grams', cols=['MS-MARCO', 'Jeopardy QGen'],
               rows=[dict(m='Gold', v=[89.6, 90.0]), dict(m='BART', v=[70.7, 32.4]), dict(m='RAG-Token', v=[77.8, 46.8]), dict(m='RAG-Seq.', v=[83.5, 53.8])])
T['t6'] = dict(id='S4.T6', name='Table 6: Ablations on the dev set',
               cols=['NQ', 'TQA', 'WQ', 'CT', 'Jeopardy B-1', 'Jeopardy QB-1', 'MS-MARCO R-L', 'MS-MARCO B-1', 'FEVER-3', 'FEVER-2'],
               note='FEVER is classification, so the two RAG models are the same there (one value per retriever).',
               rows=[dict(m='RAG-Token-BM25', r='BM25', f='tok', v=[29.7, 41.5, 32.1, 33.1, 17.5, 22.3, 55.5, 48.4, 75.1, 91.6]),
                     dict(m='RAG-Sequence-BM25', r='BM25', f='seq', v=[31.8, 44.1, 36.6, 33.8, 11.1, 19.5, 56.5, 46.9, 75.1, 91.6], shared=[8, 9]),
                     dict(m='RAG-Token-Frozen', r='Frozen', f='tok', v=[37.8, 50.1, 37.1, 51.1, 16.7, 21.7, 55.9, 49.4, 72.9, 89.4]),
                     dict(m='RAG-Sequence-Frozen', r='Frozen', f='seq', v=[41.2, 52.1, 41.8, 52.6, 11.8, 19.6, 56.7, 47.3, 72.9, 89.4], shared=[8, 9]),
                     dict(m='RAG-Token', r='Learned', f='tok', v=[43.5, 54.8, 46.5, 51.9, 17.9, 22.6, 56.2, 49.4, 74.5, 90.6]),
                     dict(m='RAG-Sequence', r='Learned', f='seq', v=[44.0, 55.8, 44.9, 53.4, 15.3, 21.5, 57.2, 47.5, 74.5, 90.6], shared=[8, 9])])
T['t7'] = dict(id='A9.T7', name='Table 7: Instances per dataset', cols=['Train', 'Dev', 'Test'],
               note='* a hidden subset is used for evaluation',
               rows=[dict(m='Natural Questions', v=[79169, 8758, 3611]), dict(m='TriviaQA', v=[78786, 8838, 11314]),
                     dict(m='WebQuestions', v=[3418, 362, 2033]), dict(m='CuratedTrec', v=[635, 134, 635]),
                     dict(m='Jeopardy Question Generation', v=[97392, 13714, 26849]), dict(m='MS-MARCO', v=[153726, 12468, 101093], star=True),
                     dict(m='FEVER-3-way', v=[145450, 10000, 10000]), dict(m='FEVER-2-way', v=[96966, 6666, 6666])])
json.dump(T, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1, ensure_ascii=False)
print('tables.json written')
