import React, { useState, useRef } from 'react';
import axiosInstance from '../api/axiosInstance';
import { Upload, Download, FileSpreadsheet, X, CheckCircle, AlertCircle, Info } from 'lucide-react';

/**
 * CSV templates with header definitions & sample rows
 */
const TEMPLATES = {
  attendance: {
    filename: 'attendance_template.csv',
    headers: 'RollNumber,Subject,Date,Status',
    sample: `RollNumber,Subject,Date,Status
CS2024001,Mathematics,2026-10-22,present
CS2024002,Mathematics,2026-10-22,absent
CS2024003,Mathematics,2026-10-22,late`,
    description: 'Bulk log daily or weekly attendance. Status must be: present, absent, or late.'
  },
  assessment: {
    filename: 'assessment_template.csv',
    headers: 'RollNumber,Subject,Type,MarksObtained,MaxMarks,Date',
    sample: `RollNumber,Subject,Type,MarksObtained,MaxMarks,Date
CS2024001,Mathematics,ut1,23,25,2026-10-05
CS2024001,Mathematics,ut2,21,25,2026-10-18
CS2024001,Mathematics,cat1,44,50,2026-10-12
CS2024001,Mathematics,cat2,46,50,2026-10-25
CS2024001,Mathematics,semester,82,100,2026-10-30`,
    description: 'Bulk log tests: ut1, ut2, cat1, cat2, or semester exam marks.'
  },
  engagement: {
    filename: 'engagement_template.csv',
    headers: 'RollNumber,Period,LoginCount,AvgSubmissionDelayHours,ParticipationScore',
    sample: `RollNumber,Period,LoginCount,AvgSubmissionDelayHours,ParticipationScore
CS2024001,2026-10,28,1.2,85
CS2024002,2026-10,14,7.5,50
CS2024003,2026-10,5,24.0,15`,
    description: 'Bulk log LMS monthly engagement metrics (Period format: YYYY-MM).'
  }
};

/**
 * Simple CSV parser that handles commas and quotes
 */
function parseCSV(text) {
  const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (rawCols.length < headers.length) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = rawCols[idx];
    });
    records.push(row);
  }
  return records;
}

const BatchCsvModal = ({ isOpen, onClose, onSuccess, currentDepartment }) => {
  const [csvType, setCsvType] = useState('attendance');
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [parseError, setParseError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Download template CSV
  const handleDownloadTemplate = () => {
    const tmpl = TEMPLATES[csvType];
    const blob = new Blob([tmpl.sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', tmpl.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle file select
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setParseError('Please upload a valid .csv file');
      return;
    }

    setFile(selectedFile);
    setParseError('');
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const rows = parseCSV(text);

        if (rows.length === 0) {
          setParseError('The uploaded CSV file is empty or missing headers.');
          setParsedData([]);
          return;
        }

        // Validate required headers
        if (csvType === 'attendance') {
          const hasRoll = rows.some((r) => r.rollnumber);
          const hasSub = rows.some((r) => r.subject);
          if (!hasRoll || !hasSub) {
            setParseError('CSV must include "RollNumber", "Subject", "Date", and "Status" columns.');
            setParsedData([]);
            return;
          }
        } else if (csvType === 'assessment') {
          const hasRoll = rows.some((r) => r.rollnumber);
          const hasMarks = rows.some((r) => r.marksobtained !== undefined);
          if (!hasRoll || !hasMarks) {
            setParseError('CSV must include "RollNumber", "Subject", "Type", "MarksObtained", and "MaxMarks".');
            setParsedData([]);
            return;
          }
        } else if (csvType === 'engagement') {
          const hasRoll = rows.some((r) => r.rollnumber);
          const hasPeriod = rows.some((r) => r.period);
          if (!hasRoll || !hasPeriod) {
            setParseError('CSV must include "RollNumber" and "Period".');
            setParsedData([]);
            return;
          }
        }

        setParsedData(rows);
      } catch (err) {
        setParseError('Error parsing CSV: ' + err.message);
        setParsedData([]);
      }
    };
    reader.readAsText(selectedFile);
  };

  // Submit batch data
  const handleUpload = async () => {
    if (!parsedData || parsedData.length === 0) return;

    setIsUploading(true);
    setParseError('');
    setResult(null);

    try {
      let endpoint = '';
      let payload = [];

      if (csvType === 'attendance') {
        endpoint = '/attendance/bulk';
        payload = parsedData.map((r) => ({
          rollNumber: r.rollnumber,
          subject: r.subject,
          date: r.date || new Date().toISOString().substring(0, 10),
          status: (r.status || 'present').toLowerCase()
        }));
      } else if (csvType === 'assessment') {
        endpoint = '/assessment/bulk';
        payload = parsedData.map((r) => ({
          rollNumber: r.rollnumber,
          subject: r.subject,
          type: (r.type || 'internal').toLowerCase(),
          marksObtained: Number(r.marksobtained),
          maxMarks: Number(r.maxmarks || 50),
          date: r.date || new Date().toISOString().substring(0, 10)
        }));
      } else if (csvType === 'engagement') {
        endpoint = '/engagement/bulk';
        payload = parsedData.map((r) => ({
          rollNumber: r.rollnumber,
          period: r.period,
          loginCount: Number(r.logincount || 0),
          avgSubmissionDelayHours: Number(r.avgsubmissiondelayhours || 0),
          participationScore: Number(r.participationscore || 0)
        }));
      }

      const res = await axiosInstance.post(endpoint, payload);

      if (res.data && res.data.success) {
        setResult(res.data.data);

        // Optional batch re-compute risk for current department
        try {
          await axiosInstance.post('/risk/batch-compute', {
            department: currentDepartment === 'all' ? undefined : currentDepartment
          });
        } catch (e) {
          console.warn('Batch compute notification triggered:', e.message);
        }

        if (onSuccess) {
          onSuccess(`Successfully processed ${res.data.data.created} records!`);
        }
      }
    } catch (err) {
      setParseError(err.response?.data?.message || err.message || 'Failed to upload batch data');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setParseError('');
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-teal-400" />
            <div>
              <h2 className="text-lg font-bold text-slate-100">Batch CSV Import</h2>
              <p className="text-xs text-slate-400">Upload entire class rosters, marks, or attendance at once</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-5">
          {['attendance', 'assessment', 'engagement'].map((t) => (
            <button
              key={t}
              onClick={() => {
                setCsvType(t);
                handleReset();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                csvType === t
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t} Import
            </button>
          ))}
        </div>

        {/* Template info banner */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 mb-5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Info className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{TEMPLATES[csvType].description}</span>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-teal-300 hover:text-teal-200 rounded-lg font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Template CSV
          </button>
        </div>

        {/* File Drop / Select Area */}
        {!file ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-teal-500 rounded-xl p-8 text-center cursor-pointer bg-slate-800/30 hover:bg-slate-800/60 transition-all mb-4"
          >
            <Upload className="w-10 h-10 text-teal-400 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-slate-200">Click to browse or drop your CSV file here</p>
            <p className="text-xs text-slate-500 mt-1">Accepts standard .csv format matching the template structure</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-teal-400">Ready to Upload:</p>
                <p className="text-sm font-bold text-slate-100">{file.name}</p>
                <p className="text-xs text-slate-400">{parsedData.length} records parsed from file</p>
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-red-400 transition-colors"
              >
                Change File
              </button>
            </div>

            {/* Quick Preview Table (first 3 rows) */}
            {parsedData.length > 0 && (
              <div className="overflow-x-auto border border-slate-700/60 rounded-lg max-h-36">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 sticky top-0 text-slate-400 uppercase text-[10px]">
                    <tr>
                      {Object.keys(parsedData[0]).map((k) => (
                        <th key={k} className="p-2 border-b border-slate-700">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {parsedData.slice(0, 3).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-700/20">
                        {Object.values(row).map((val, vIdx) => (
                          <td key={vIdx} className="p-2 font-mono text-[11px]">{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Error Notification */}
        {parseError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl p-3 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Success Report */}
        {result && (
          <div className="bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 font-bold text-sm mb-1">
              <CheckCircle className="w-4 h-4 text-teal-400" />
              Batch Import Completed
            </div>
            <p>Successfully inserted/updated: <strong className="text-white">{result.created}</strong> records</p>
            {result.failed > 0 && (
              <div className="mt-2 text-amber-300">
                <p>Failed: {result.failed} rows</p>
                <ul className="list-disc ml-5 mt-1 space-y-0.5 text-[11px]">
                  {result.errors.slice(0, 3).map((err, i) => (
                    <li key={i}>{err.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
          >
            Close
          </button>
          <button
            disabled={!file || parsedData.length === 0 || isUploading}
            onClick={handleUpload}
            className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg flex items-center gap-2 transition-all ${
              !file || parsedData.length === 0 || isUploading
                ? 'bg-teal-800/50 cursor-not-allowed opacity-50'
                : 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/30'
            }`}
          >
            {isUploading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing Batch...
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                Import {parsedData.length > 0 ? `${parsedData.length} Records` : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchCsvModal;
