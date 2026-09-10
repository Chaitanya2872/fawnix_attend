"use strict";
/**
 * Dependency-free spreadsheet reader for the employee bulk import.
 *
 * CSV/TSV is parsed inline (RFC 4180 rules: quoted fields, escaped quotes,
 * embedded newlines). XLSX is a ZIP of XML parts, so we walk the ZIP central
 * directory ourselves and inflate the entries we need with the browser's
 * native DecompressionStream — no third-party library involved.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSpreadsheetFile = isSpreadsheetFile;
exports.readSpreadsheet = readSpreadsheet;
exports.readDelimitedText = readDelimitedText;
var XLSX_EXTENSIONS = /\.(xlsx|xlsm)$/i;
var LEGACY_EXCEL = /\.xls$/i;
function isSpreadsheetFile(file) {
    return XLSX_EXTENSIONS.test(file.name) || /\.(csv|tsv|txt)$/i.test(file.name);
}
/** Reads a CSV/TSV/XLSX file into headers + rows. */
function readSpreadsheet(file, sheetName) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (LEGACY_EXCEL.test(file.name)) {
                        throw new Error('Legacy .xls files are not supported. Open the file in Excel and use "Save As" to create an .xlsx or .csv file.');
                    }
                    if (!XLSX_EXTENSIONS.test(file.name)) return [3 /*break*/, 2];
                    _a = readXlsx;
                    return [4 /*yield*/, file.arrayBuffer()];
                case 1: return [2 /*return*/, _a.apply(void 0, [_c.sent(), sheetName])];
                case 2:
                    _b = readDelimitedText;
                    return [4 /*yield*/, file.text()];
                case 3: return [2 /*return*/, _b.apply(void 0, [_c.sent()])];
            }
        });
    });
}
/* ------------------------------------------------------------------ */
/* CSV / TSV                                                           */
/* ------------------------------------------------------------------ */
/** Picks the delimiter that yields the most columns on the header line. */
function detectDelimiter(text) {
    var firstLine = text.slice(0, text.indexOf('\n') === -1 ? text.length : text.indexOf('\n'));
    var candidates = [',', ';', '\t', '|'];
    var best = ',';
    var bestCount = 0;
    for (var _i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
        var candidate = candidates_1[_i];
        // Count only delimiters outside quotes.
        var count = 0;
        var inQuotes = false;
        for (var i = 0; i < firstLine.length; i += 1) {
            var char = firstLine[i];
            if (char === '"')
                inQuotes = !inQuotes;
            else if (char === candidate && !inQuotes)
                count += 1;
        }
        if (count > bestCount) {
            bestCount = count;
            best = candidate;
        }
    }
    return best;
}
function readDelimitedText(raw) {
    var text = raw.replace(/^\uFEFF/, '');
    var delimiter = detectDelimiter(text);
    var matrix = [];
    var row = [];
    var value = '';
    var inQuotes = false;
    var endValue = function () {
        row.push(value);
        value = '';
    };
    var endRow = function () {
        endValue();
        matrix.push(row);
        row = [];
    };
    for (var i = 0; i < text.length; i += 1) {
        var char = text[i];
        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    value += '"';
                    i += 1;
                }
                else {
                    inQuotes = false;
                }
            }
            else {
                value += char;
            }
            continue;
        }
        if (char === '"') {
            inQuotes = true;
        }
        else if (char === delimiter) {
            endValue();
        }
        else if (char === '\n') {
            endRow();
        }
        else if (char === '\r') {
            // handled by the \n that follows; a lone \r also ends the row
            if (text[i + 1] !== '\n')
                endRow();
        }
        else {
            value += char;
        }
    }
    // Trailing value/row (file not ending in a newline).
    if (value !== '' || row.length > 0)
        endRow();
    return shapeMatrix(matrix);
}
/** Reads the ZIP central directory. Returns entry metadata by file name. */
function readZipDirectory(buffer) {
    var view = new DataView(buffer);
    var bytes = new Uint8Array(buffer);
    // The End Of Central Directory record lives in the last 64KB + 22 bytes.
    var scanFrom = Math.max(0, bytes.length - (0xffff + 22));
    var eocd = -1;
    for (var i = bytes.length - 22; i >= scanFrom; i -= 1) {
        if (view.getUint32(i, true) === 0x06054b50) {
            eocd = i;
            break;
        }
    }
    if (eocd === -1) {
        throw new Error('This file does not look like a valid .xlsx workbook.');
    }
    var entryCount = view.getUint16(eocd + 10, true);
    var pointer = view.getUint32(eocd + 16, true);
    var entries = new Map();
    var decoder = new TextDecoder();
    for (var i = 0; i < entryCount; i += 1) {
        if (view.getUint32(pointer, true) !== 0x02014b50)
            break;
        var method = view.getUint16(pointer + 10, true);
        var compressedSize = view.getUint32(pointer + 20, true);
        var nameLength = view.getUint16(pointer + 28, true);
        var extraLength = view.getUint16(pointer + 30, true);
        var commentLength = view.getUint16(pointer + 32, true);
        var localOffset = view.getUint32(pointer + 42, true);
        var name_1 = decoder.decode(bytes.subarray(pointer + 46, pointer + 46 + nameLength));
        entries.set(name_1, { name: name_1, offset: localOffset, compressedSize: compressedSize, method: method });
        pointer += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
}
/** Inflates one ZIP entry to text. */
function readZipEntry(buffer, entry) {
    return __awaiter(this, void 0, void 0, function () {
        var view, bytes, nameLength, extraLength, dataStart, raw, stream;
        return __generator(this, function (_a) {
            view = new DataView(buffer);
            bytes = new Uint8Array(buffer);
            if (view.getUint32(entry.offset, true) !== 0x04034b50) {
                throw new Error('The .xlsx file appears to be corrupted.');
            }
            nameLength = view.getUint16(entry.offset + 26, true);
            extraLength = view.getUint16(entry.offset + 28, true);
            dataStart = entry.offset + 30 + nameLength + extraLength;
            raw = bytes.subarray(dataStart, dataStart + entry.compressedSize);
            if (entry.method === 0)
                return [2 /*return*/, new TextDecoder().decode(raw)];
            if (entry.method !== 8) {
                throw new Error("Unsupported compression in the .xlsx file (method ".concat(entry.method, ")."));
            }
            if (typeof DecompressionStream === 'undefined') {
                throw new Error('This browser cannot read .xlsx files. Please upload a CSV instead.');
            }
            stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
            return [2 /*return*/, new Response(stream).text()];
        });
    });
}
var parseXml = function (xml) { return new DOMParser().parseFromString(xml, 'application/xml'); };
/** Converts an Excel column reference (A, B, ..., AA) to a zero-based index. */
function columnIndex(cellRef) {
    var index = 0;
    for (var i = 0; i < cellRef.length; i += 1) {
        var code = cellRef.charCodeAt(i);
        if (code < 65 || code > 90)
            break;
        index = index * 26 + (code - 64);
    }
    return index - 1;
}
/** Excel serial date → yyyy-mm-dd (1900 date system, including its leap-year quirk). */
function serialToDate(serial) {
    var ms = Math.round((serial - 25569) * 86400 * 1000);
    var date = new Date(ms);
    if (Number.isNaN(date.getTime()))
        return String(serial);
    return date.toISOString().slice(0, 10);
}
var BUILTIN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);
/** Style index → true when that style renders as a date. */
function readDateStyles(stylesXml) {
    var dateStyles = new Set();
    if (!stylesXml)
        return dateStyles;
    var doc = parseXml(stylesXml);
    var customDateFormats = new Set();
    doc.querySelectorAll('numFmts > numFmt').forEach(function (node) {
        var id = Number(node.getAttribute('numFmtId'));
        var code = (node.getAttribute('formatCode') || '').replace(/\[[^\]]*\]|"[^"]*"/g, '');
        if (Number.isFinite(id) && /[dmyh]/i.test(code))
            customDateFormats.add(id);
    });
    var cellXfs = doc.querySelector('cellXfs');
    if (!cellXfs)
        return dateStyles;
    Array.from(cellXfs.children).forEach(function (node, index) {
        var formatId = Number(node.getAttribute('numFmtId') || 0);
        if (BUILTIN_DATE_FORMATS.has(formatId) || customDateFormats.has(formatId)) {
            dateStyles.add(index);
        }
    });
    return dateStyles;
}
/** Concatenates the text runs of one shared-string entry. */
function sharedStringText(node) {
    return Array.from(node.getElementsByTagName('t'))
        .map(function (textNode) { return textNode.textContent || ''; })
        .join('');
}
function readXlsx(buffer, wantedSheet) {
    return __awaiter(this, void 0, void 0, function () {
        var entries, readPart, workbookXml, relsXml, relTargets, sheets, target, sheetXml, sharedXml, sharedStrings, dateStyles, _a, matrix;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    entries = readZipDirectory(buffer);
                    readPart = function (name) { return __awaiter(_this, void 0, void 0, function () {
                        var entry;
                        return __generator(this, function (_a) {
                            entry = entries.get(name);
                            return [2 /*return*/, entry ? readZipEntry(buffer, entry) : null];
                        });
                    }); };
                    return [4 /*yield*/, readPart('xl/workbook.xml')];
                case 1:
                    workbookXml = _b.sent();
                    if (!workbookXml)
                        throw new Error('This file does not contain a readable Excel workbook.');
                    return [4 /*yield*/, readPart('xl/_rels/workbook.xml.rels')];
                case 2:
                    relsXml = _b.sent();
                    relTargets = new Map();
                    if (relsXml) {
                        parseXml(relsXml)
                            .querySelectorAll('Relationship')
                            .forEach(function (rel) {
                            var id = rel.getAttribute('Id');
                            var target = (rel.getAttribute('Target') || '').replace(/^\/?xl\//, '').replace(/^\//, '');
                            if (id)
                                relTargets.set(id, target);
                        });
                    }
                    sheets = Array.from(parseXml(workbookXml).querySelectorAll('sheets > sheet')).map(function (sheet, index) { return ({
                        name: sheet.getAttribute('name') || "Sheet".concat(index + 1),
                        path: relTargets.get(sheet.getAttribute('r:id') || sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || '') ||
                            "worksheets/sheet".concat(index + 1, ".xml"),
                    }); });
                    if (sheets.length === 0)
                        throw new Error('This workbook has no worksheets.');
                    target = sheets.find(function (sheet) { return sheet.name === wantedSheet; }) || sheets[0];
                    return [4 /*yield*/, readPart("xl/".concat(target.path))];
                case 3:
                    sheetXml = _b.sent();
                    if (!sheetXml)
                        throw new Error("Could not read the \"".concat(target.name, "\" worksheet."));
                    return [4 /*yield*/, readPart('xl/sharedStrings.xml')];
                case 4:
                    sharedXml = _b.sent();
                    sharedStrings = sharedXml
                        ? Array.from(parseXml(sharedXml).getElementsByTagName('si')).map(sharedStringText)
                        : [];
                    _a = readDateStyles;
                    return [4 /*yield*/, readPart('xl/styles.xml')];
                case 5:
                    dateStyles = _a.apply(void 0, [_b.sent()]);
                    matrix = [];
                    parseXml(sheetXml)
                        .querySelectorAll('sheetData > row')
                        .forEach(function (rowNode) {
                        var values = [];
                        rowNode.querySelectorAll('c').forEach(function (cell) {
                            var _a, _b;
                            var ref = cell.getAttribute('r') || '';
                            var index = ref ? columnIndex(ref) : values.length;
                            var type = cell.getAttribute('t') || 'n';
                            var text = '';
                            if (type === 'inlineStr') {
                                text = sharedStringText(cell);
                            }
                            else {
                                var rawValue = ((_a = cell.querySelector('v')) === null || _a === void 0 ? void 0 : _a.textContent) || '';
                                if (type === 's') {
                                    text = (_b = sharedStrings[Number(rawValue)]) !== null && _b !== void 0 ? _b : '';
                                }
                                else if (type === 'b') {
                                    text = rawValue === '1' ? 'TRUE' : 'FALSE';
                                }
                                else if (type === 'e') {
                                    text = '';
                                }
                                else {
                                    var styleIndex = Number(cell.getAttribute('s') || -1);
                                    var numeric = Number(rawValue);
                                    text =
                                        rawValue !== '' && Number.isFinite(numeric) && dateStyles.has(styleIndex)
                                            ? serialToDate(numeric)
                                            : rawValue;
                                }
                            }
                            while (values.length < index)
                                values.push('');
                            values[index] = text;
                        });
                        matrix.push(values);
                    });
                    return [2 /*return*/, __assign(__assign({}, shapeMatrix(matrix)), { sheetName: target.name, sheetNames: sheets.map(function (sheet) { return sheet.name; }) })];
            }
        });
    });
}
/* ------------------------------------------------------------------ */
/* Shared shaping                                                      */
/* ------------------------------------------------------------------ */
var isBlankRow = function (row) { return row.every(function (cell) { return (cell !== null && cell !== void 0 ? cell : '').trim() === ''; }); };
/** Drops leading blank rows, takes the first as headers, pads every data row. */
function shapeMatrix(matrix) {
    var _a;
    var meaningful = matrix.filter(function (row) { return !isBlankRow(row); });
    if (meaningful.length === 0) {
        throw new Error('This file appears to be empty.');
    }
    var headerRow = meaningful[0];
    // Trailing empty header cells are noise from spreadsheet exports.
    var width = headerRow.length;
    while (width > 0 && ((_a = headerRow[width - 1]) !== null && _a !== void 0 ? _a : '').trim() === '')
        width -= 1;
    var headers = headerRow.slice(0, width).map(function (header, index) {
        var label = (header !== null && header !== void 0 ? header : '').trim();
        return label || "Column ".concat(index + 1);
    });
    var rows = meaningful.slice(1).map(function (row) {
        var padded = row.slice(0, width).map(function (cell) { return (cell !== null && cell !== void 0 ? cell : '').trim(); });
        while (padded.length < width)
            padded.push('');
        return padded;
    });
    return { headers: headers, rows: rows };
}
