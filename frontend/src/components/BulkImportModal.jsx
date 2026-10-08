import React, { useState } from 'react';
import * as XLSX from 'xlsx';

export default function BulkImportModal({ isOpen, onClose, onImport }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [errors, setErrors] = useState([]);
  const [previewData, setPreviewData] = useState(null);

  if (!isOpen) return null;

  // 1. Download Excel Template
  const handleDownloadTemplate = () => {
    // Sheet 1: Questions Template
    const questionsData = [
      {
        question: 'What is Python?',
        type: 'mcq',
        optionA: 'Programming Language',
        optionB: 'Database',
        optionC: 'Operating System',
        optionD: 'Browser',
        correctAnswer: 'A',
        marks: 1,
      },
      {
        question: 'Which library is used for data analysis in Python?',
        type: 'mcq',
        optionA: 'Pandas',
        optionB: 'React',
        optionC: 'Express',
        optionD: 'MongoDB',
        correctAnswer: 'A',
        marks: 1,
      },
      {
        question: 'Explain the difference between SQL and NoSQL databases.',
        type: 'input',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctAnswer: '',
        marks: 2,
      },
    ];

    const wsQuestions = XLSX.utils.json_to_sheet(questionsData, {
      header: [
        'question',
        'type',
        'optionA',
        'optionB',
        'optionC',
        'optionD',
        'correctAnswer',
        'marks',
      ],
    });

    // Sheet 2: Instructions
    const instructionsData = [
      { Column: 'question', Requirement: 'Required', Rules: 'Exact question text. Non-empty string.' },
      { Column: 'type', Requirement: 'Required', Rules: 'Must be either "mcq" or "input".' },
      { Column: 'optionA - optionD', Requirement: 'Required for MCQ', Rules: 'Fill all 4 options for MCQ questions. Leave blank for input questions.' },
      { Column: 'correctAnswer', Requirement: 'Required for MCQ', Rules: 'Must be A, B, C, or D (or exact option text). Leave blank for input questions.' },
      { Column: 'marks', Requirement: 'Optional', Rules: 'Positive integer or decimal (default is 1 if empty).' },
    ];
    const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsQuestions, 'Questions');
    XLSX.utils.book_append_sheet(workbook, wsInstructions, 'Instructions');

    XLSX.writeFile(workbook, 'Assessment_Questions_Template.xlsx');
  };

  // Reset state
  const handleReset = () => {
    setFile(null);
    setErrors([]);
    setPreviewData(null);
  };

  // Drag & drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Process & Validate file
  const processFile = (selectedFile) => {
    setFile(selectedFile);
    setParsing(true);
    setErrors([]);
    setPreviewData(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        validateAndSetPreview(rawRows);
      } catch (err) {
        setErrors(['Failed to read file. Please upload a valid .xlsx or .csv file.']);
      } finally {
        setParsing(false);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const validateAndSetPreview = (rows) => {
    const errList = [];
    const parsedQuestions = [];

    // Filter out completely blank rows
    const activeRows = rows.filter((r) => {
      const values = Object.values(r).join('').trim();
      return values.length > 0;
    });

    if (activeRows.length === 0) {
      setErrors(['The uploaded file contains no data rows.']);
      return;
    }

    if (activeRows.length > 100) {
      setErrors(['Maximum 100 questions per import allowed. Please reduce the number of rows.']);
      return;
    }

    activeRows.forEach((row, idx) => {
      const rowNum = idx + 2; // Accounting for header row
      const qText = String(row.question || '').trim();
      const qType = String(row.type || '').trim().toLowerCase();
      const rawMarks = row.marks !== '' && row.marks !== undefined ? Number(row.marks) : 1;

      // Question text check
      if (!qText) {
        errList.push(`Row ${rowNum}: Question text is missing.`);
      }

      // Type check
      if (qType !== 'mcq' && qType !== 'input') {
        errList.push(`Row ${rowNum}: Invalid question type "${row.type}". Must be "mcq" or "input".`);
      }

      // Marks check
      if (isNaN(rawMarks) || rawMarks < 0) {
        errList.push(`Row ${rowNum}: Marks must be a positive number.`);
      }

      if (qType === 'mcq') {
        const optA = String(row.optionA || '').trim();
        const optB = String(row.optionB || '').trim();
        const optC = String(row.optionC || '').trim();
        const optD = String(row.optionD || '').trim();

        if (!optA || !optB || !optC || !optD) {
          errList.push(`Row ${rowNum}: MCQ questions require all 4 options (optionA, optionB, optionC, optionD).`);
        }

        const rawCorrect = String(row.correctAnswer || '').trim();
        let resolvedCorrect = '';

        if (['A', 'B', 'C', 'D'].includes(rawCorrect.toUpperCase())) {
          const letter = rawCorrect.toUpperCase();
          if (letter === 'A') resolvedCorrect = optA;
          if (letter === 'B') resolvedCorrect = optB;
          if (letter === 'C') resolvedCorrect = optC;
          if (letter === 'D') resolvedCorrect = optD;
        } else if ([optA, optB, optC, optD].includes(rawCorrect)) {
          resolvedCorrect = rawCorrect;
        } else {
          errList.push(`Row ${rowNum}: Correct answer "${row.correctAnswer}" must be A, B, C, or D (or match one of optionA-D).`);
        }

        parsedQuestions.push({
          rowNum,
          question: qText,
          type: 'mcq',
          options: [optA, optB, optC, optD],
          correctAnswer: resolvedCorrect,
          marks: rawMarks,
        });
      } else if (qType === 'input') {
        parsedQuestions.push({
          rowNum,
          question: qText,
          type: 'input',
          options: ['', '', '', ''],
          correctAnswer: '',
          marks: rawMarks,
        });
      }
    });

    if (errList.length > 0) {
      setErrors(errList);
      setPreviewData(null);
    } else {
      setErrors([]);
      setPreviewData(parsedQuestions);
    }
  };

  const handleConfirmImport = () => {
    if (!previewData || previewData.length === 0) return;
    onImport(previewData);
    handleReset();
    onClose();
  };

  const totalImportMarks = previewData
    ? previewData.reduce((sum, q) => sum + q.marks, 0)
    : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal bulk-import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon">📦</span>
            <div>
              <h3>Import Questions</h3>
              <p>Quickly add multiple questions using an Excel (.xlsx) or CSV (.csv) file.</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Action Bar */}
          <div className="import-action-bar">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={handleDownloadTemplate}
            >
              📥 Download Excel Template
            </button>
            <span className="import-limit-note">Maximum 100 questions per file</span>
          </div>

          {/* Upload Area */}
          {!previewData && (
            <div
              className={`file-upload-dropzone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="dropzone-icon">📄</div>
              <p className="dropzone-text">
                <strong>Drop your file here</strong> or browse from your computer
              </p>
              <span className="dropzone-subtext">Supports .xlsx, .xls, and .csv files</span>
              <label className="btn-primary btn-sm dropzone-btn">
                Choose File
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>
              {file && <div className="selected-filename">Selected: {file.name}</div>}
            </div>
          )}

          {parsing && (
            <div className="center-content">
              <div className="spinner" />
              <span style={{ marginLeft: 10 }}>Parsing & validating questions...</span>
            </div>
          )}

          {/* Error Summary */}
          {errors.length > 0 && (
            <div className="import-errors-box">
              <div className="errors-header">
                ⚠️ {errors.length} issue{errors.length !== 1 ? 's' : ''} detected. Please fix your Excel file and upload again:
              </div>
              <ul className="errors-list">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
              <button className="btn-ghost btn-sm reupload-btn" onClick={handleReset}>
                🔄 Upload Different File
              </button>
            </div>
          )}

          {/* Validation Preview */}
          {previewData && (
            <div className="import-preview-section">
              <div className="preview-summary-banner">
                <span className="summary-chip success">✓ {previewData.length} Questions Detected</span>
                <span className="summary-chip info">✓ All Valid</span>
                <span className="summary-chip total">Total Marks: {totalImportMarks}</span>
              </div>

              <div className="preview-table-wrapper">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Question</th>
                      <th>Type</th>
                      <th>Options</th>
                      <th>Correct Answer</th>
                      <th>Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((q, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td className="preview-q-text">{q.question}</td>
                        <td>
                          <span className={`type-badge ${q.type}`}>{q.type.toUpperCase()}</span>
                        </td>
                        <td>
                          {q.type === 'mcq'
                            ? `${q.options.filter(Boolean).length} Options`
                            : '—'}
                        </td>
                        <td>
                          {q.type === 'mcq' ? (
                            <span className="correct-ans-preview">{q.correctAnswer}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>{q.marks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          {previewData && (
            <button
              type="button"
              id="confirm-import-btn"
              className="btn-primary"
              onClick={handleConfirmImport}
            >
              Import {previewData.length} Questions
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
