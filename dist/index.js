/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 593:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TokenType = exports.utf8 = exports.JSONParser = exports.TokenParser = exports.Tokenizer = void 0;
var tokenizer_1 = __nccwpck_require__(85);
Object.defineProperty(exports, "Tokenizer", ({ enumerable: true, get: function () { return tokenizer_1.default; } }));
var tokenparser_1 = __nccwpck_require__(861);
Object.defineProperty(exports, "TokenParser", ({ enumerable: true, get: function () { return tokenparser_1.default; } }));
var jsonparser_1 = __nccwpck_require__(427);
Object.defineProperty(exports, "JSONParser", ({ enumerable: true, get: function () { return jsonparser_1.default; } }));
exports.utf8 = __nccwpck_require__(493);
var constants_1 = __nccwpck_require__(407);
Object.defineProperty(exports, "TokenType", ({ enumerable: true, get: function () { return constants_1.TokenType; } }));


/***/ }),

/***/ 427:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
const tokenizer_1 = __nccwpck_require__(85);
const tokenparser_1 = __nccwpck_require__(861);
class JSONParser {
    constructor(opts = {}) {
        this.tokenizer = new tokenizer_1.default(opts);
        this.tokenParser = new tokenparser_1.default(opts);
        this.tokenizer.onToken = this.tokenParser.write.bind(this.tokenParser);
        this.tokenizer.onEnd = () => {
            if (!this.tokenParser.isEnded)
                this.tokenParser.end();
        };
        this.tokenParser.onError = this.tokenizer.error.bind(this.tokenizer);
        this.tokenParser.onEnd = () => {
            if (!this.tokenizer.isEnded)
                this.tokenizer.end();
        };
    }
    get isEnded() {
        return this.tokenizer.isEnded && this.tokenParser.isEnded;
    }
    write(input) {
        this.tokenizer.write(input);
    }
    end() {
        this.tokenizer.end();
    }
    set onToken(cb) {
        this.tokenizer.onToken = cb;
    }
    set onValue(cb) {
        this.tokenParser.onValue = cb;
    }
    set onError(cb) {
        this.tokenizer.onError = cb;
    }
    set onEnd(cb) {
        this.tokenParser.onEnd = () => {
            if (!this.tokenizer.isEnded)
                this.tokenizer.end();
            cb.call(this.tokenParser);
        };
    }
}
exports["default"] = JSONParser;


/***/ }),

/***/ 85:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TokenizerError = void 0;
const utf_8_1 = __nccwpck_require__(493);
const bufferedString_1 = __nccwpck_require__(945);
const constants_1 = __nccwpck_require__(407);
const { LEFT_BRACE, RIGHT_BRACE, LEFT_BRACKET, RIGHT_BRACKET, COLON, COMMA, TRUE, FALSE, NULL, STRING, NUMBER, } = constants_1.TokenType;
// Tokenizer States
var TokenizerStates;
(function (TokenizerStates) {
    TokenizerStates[TokenizerStates["START"] = 0] = "START";
    TokenizerStates[TokenizerStates["ENDED"] = 1] = "ENDED";
    TokenizerStates[TokenizerStates["ERROR"] = 2] = "ERROR";
    TokenizerStates[TokenizerStates["TRUE1"] = 3] = "TRUE1";
    TokenizerStates[TokenizerStates["TRUE2"] = 4] = "TRUE2";
    TokenizerStates[TokenizerStates["TRUE3"] = 5] = "TRUE3";
    TokenizerStates[TokenizerStates["FALSE1"] = 6] = "FALSE1";
    TokenizerStates[TokenizerStates["FALSE2"] = 7] = "FALSE2";
    TokenizerStates[TokenizerStates["FALSE3"] = 8] = "FALSE3";
    TokenizerStates[TokenizerStates["FALSE4"] = 9] = "FALSE4";
    TokenizerStates[TokenizerStates["NULL1"] = 10] = "NULL1";
    TokenizerStates[TokenizerStates["NULL2"] = 11] = "NULL2";
    TokenizerStates[TokenizerStates["NULL3"] = 12] = "NULL3";
    TokenizerStates[TokenizerStates["STRING_DEFAULT"] = 13] = "STRING_DEFAULT";
    TokenizerStates[TokenizerStates["STRING_AFTER_BACKSLASH"] = 14] = "STRING_AFTER_BACKSLASH";
    TokenizerStates[TokenizerStates["STRING_UNICODE_DIGIT_1"] = 15] = "STRING_UNICODE_DIGIT_1";
    TokenizerStates[TokenizerStates["STRING_UNICODE_DIGIT_2"] = 16] = "STRING_UNICODE_DIGIT_2";
    TokenizerStates[TokenizerStates["STRING_UNICODE_DIGIT_3"] = 17] = "STRING_UNICODE_DIGIT_3";
    TokenizerStates[TokenizerStates["STRING_UNICODE_DIGIT_4"] = 18] = "STRING_UNICODE_DIGIT_4";
    TokenizerStates[TokenizerStates["STRING_INCOMPLETE_CHAR"] = 19] = "STRING_INCOMPLETE_CHAR";
    TokenizerStates[TokenizerStates["NUMBER_AFTER_INITIAL_MINUS"] = 20] = "NUMBER_AFTER_INITIAL_MINUS";
    TokenizerStates[TokenizerStates["NUMBER_AFTER_INITIAL_ZERO"] = 21] = "NUMBER_AFTER_INITIAL_ZERO";
    TokenizerStates[TokenizerStates["NUMBER_AFTER_INITIAL_NON_ZERO"] = 22] = "NUMBER_AFTER_INITIAL_NON_ZERO";
    TokenizerStates[TokenizerStates["NUMBER_AFTER_FULL_STOP"] = 23] = "NUMBER_AFTER_FULL_STOP";
    TokenizerStates[TokenizerStates["NUMBER_AFTER_DECIMAL"] = 24] = "NUMBER_AFTER_DECIMAL";
    TokenizerStates[TokenizerStates["NUMBER_AFTER_E"] = 25] = "NUMBER_AFTER_E";
    TokenizerStates[TokenizerStates["NUMBER_AFTER_E_AND_SIGN"] = 26] = "NUMBER_AFTER_E_AND_SIGN";
    TokenizerStates[TokenizerStates["NUMBER_AFTER_E_AND_DIGIT"] = 27] = "NUMBER_AFTER_E_AND_DIGIT";
    TokenizerStates[TokenizerStates["SEPARATOR"] = 28] = "SEPARATOR";
})(TokenizerStates || (TokenizerStates = {}));
const defaultOpts = {
    stringBufferSize: 0,
    numberBufferSize: 0,
    separator: undefined,
};
class TokenizerError extends Error {
    constructor(message) {
        super(message);
        // Typescript is broken. This is a workaround
        Object.setPrototypeOf(this, TokenizerError.prototype);
    }
}
exports.TokenizerError = TokenizerError;
class Tokenizer {
    constructor(opts) {
        this.state = TokenizerStates.START;
        this.separatorIndex = 0;
        this.unicode = undefined; // unicode escapes
        this.highSurrogate = undefined;
        this.bytes_remaining = 0; // number of bytes remaining in multi byte utf8 char to read after split boundary
        this.bytes_in_sequence = 0; // bytes in multi byte utf8 char to read
        this.char_split_buffer = new Uint8Array(4); // for rebuilding chars split before boundary is reached
        this.encoder = new TextEncoder();
        this.offset = -1;
        opts = Object.assign(Object.assign({}, defaultOpts), opts);
        this.bufferedString =
            opts.stringBufferSize && opts.stringBufferSize > 4
                ? new bufferedString_1.BufferedString(opts.stringBufferSize)
                : new bufferedString_1.NonBufferedString();
        this.bufferedNumber =
            opts.numberBufferSize && opts.numberBufferSize > 0
                ? new bufferedString_1.BufferedString(opts.numberBufferSize)
                : new bufferedString_1.NonBufferedString();
        this.separator = opts.separator;
        this.separatorBytes = opts.separator
            ? this.encoder.encode(opts.separator)
            : undefined;
    }
    get isEnded() {
        return this.state === TokenizerStates.ENDED;
    }
    write(input) {
        let buffer;
        if (input instanceof Uint8Array) {
            buffer = input;
        }
        else if (typeof input === "string") {
            buffer = this.encoder.encode(input);
        }
        else if ((typeof input === "object" && "buffer" in input) ||
            Array.isArray(input)) {
            buffer = Uint8Array.from(input);
        }
        else {
            this.error(new TypeError("Unexpected type. The `write` function only accepts Arrays, TypedArrays and Strings."));
            return;
        }
        for (let i = 0; i < buffer.length; i += 1) {
            const n = buffer[i]; // get current byte from buffer
            switch (this.state) {
                case TokenizerStates.START:
                    this.offset += 1;
                    if (this.separatorBytes && n === this.separatorBytes[0]) {
                        if (this.separatorBytes.length === 1) {
                            this.state = TokenizerStates.START;
                            this.onToken(constants_1.TokenType.SEPARATOR, this.separator, this.offset + this.separatorBytes.length - 1);
                            continue;
                        }
                        this.state = TokenizerStates.SEPARATOR;
                        continue;
                    }
                    if (n === utf_8_1.charset.SPACE ||
                        n === utf_8_1.charset.NEWLINE ||
                        n === utf_8_1.charset.CARRIAGE_RETURN ||
                        n === utf_8_1.charset.TAB) {
                        // whitespace
                        continue;
                    }
                    if (n === utf_8_1.charset.LEFT_CURLY_BRACKET) {
                        this.onToken(LEFT_BRACE, "{", this.offset);
                        continue;
                    }
                    if (n === utf_8_1.charset.RIGHT_CURLY_BRACKET) {
                        this.onToken(RIGHT_BRACE, "}", this.offset);
                        continue;
                    }
                    if (n === utf_8_1.charset.LEFT_SQUARE_BRACKET) {
                        this.onToken(LEFT_BRACKET, "[", this.offset);
                        continue;
                    }
                    if (n === utf_8_1.charset.RIGHT_SQUARE_BRACKET) {
                        this.onToken(RIGHT_BRACKET, "]", this.offset);
                        continue;
                    }
                    if (n === utf_8_1.charset.COLON) {
                        this.onToken(COLON, ":", this.offset);
                        continue;
                    }
                    if (n === utf_8_1.charset.COMMA) {
                        this.onToken(COMMA, ",", this.offset);
                        continue;
                    }
                    if (n === utf_8_1.charset.LATIN_SMALL_LETTER_T) {
                        this.state = TokenizerStates.TRUE1;
                        continue;
                    }
                    if (n === utf_8_1.charset.LATIN_SMALL_LETTER_F) {
                        this.state = TokenizerStates.FALSE1;
                        continue;
                    }
                    if (n === utf_8_1.charset.LATIN_SMALL_LETTER_N) {
                        this.state = TokenizerStates.NULL1;
                        continue;
                    }
                    if (n === utf_8_1.charset.QUOTATION_MARK) {
                        this.bufferedString.reset();
                        this.state = TokenizerStates.STRING_DEFAULT;
                        continue;
                    }
                    if (n >= utf_8_1.charset.DIGIT_ONE && n <= utf_8_1.charset.DIGIT_NINE) {
                        this.bufferedNumber.reset();
                        this.bufferedNumber.appendChar(n);
                        this.state = TokenizerStates.NUMBER_AFTER_INITIAL_NON_ZERO;
                        continue;
                    }
                    if (n === utf_8_1.charset.DIGIT_ZERO) {
                        this.bufferedNumber.reset();
                        this.bufferedNumber.appendChar(n);
                        this.state = TokenizerStates.NUMBER_AFTER_INITIAL_ZERO;
                        continue;
                    }
                    if (n === utf_8_1.charset.HYPHEN_MINUS) {
                        this.bufferedNumber.reset();
                        this.bufferedNumber.appendChar(n);
                        this.state = TokenizerStates.NUMBER_AFTER_INITIAL_MINUS;
                        continue;
                    }
                    break;
                // STRING
                case TokenizerStates.STRING_DEFAULT:
                    if (n === utf_8_1.charset.QUOTATION_MARK) {
                        const string = this.bufferedString.toString();
                        this.state = TokenizerStates.START;
                        this.onToken(STRING, string, this.offset);
                        this.offset += this.bufferedString.byteLength + 1;
                        continue;
                    }
                    if (n === utf_8_1.charset.REVERSE_SOLIDUS) {
                        this.state = TokenizerStates.STRING_AFTER_BACKSLASH;
                        continue;
                    }
                    if (n >= 128) {
                        // Parse multi byte (>=128) chars one at a time
                        if (n >= 194 && n <= 223) {
                            this.bytes_in_sequence = 2;
                        }
                        else if (n <= 239) {
                            this.bytes_in_sequence = 3;
                        }
                        else {
                            this.bytes_in_sequence = 4;
                        }
                        if (this.bytes_in_sequence <= buffer.length - i) {
                            // if bytes needed to complete char fall outside buffer length, we have a boundary split
                            this.bufferedString.appendBuf(buffer, i, i + this.bytes_in_sequence);
                            i += this.bytes_in_sequence - 1;
                            continue;
                        }
                        this.bytes_remaining = i + this.bytes_in_sequence - buffer.length;
                        this.char_split_buffer.set(buffer.subarray(i));
                        i = buffer.length - 1;
                        this.state = TokenizerStates.STRING_INCOMPLETE_CHAR;
                        continue;
                    }
                    if (n >= utf_8_1.charset.SPACE) {
                        this.bufferedString.appendChar(n);
                        continue;
                    }
                    break;
                case TokenizerStates.STRING_INCOMPLETE_CHAR:
                    // check for carry over of a multi byte char split between data chunks
                    // & fill temp buffer it with start of this data chunk up to the boundary limit set in the last iteration
                    this.char_split_buffer.set(buffer.subarray(i, i + this.bytes_remaining), this.bytes_in_sequence - this.bytes_remaining);
                    this.bufferedString.appendBuf(this.char_split_buffer, 0, this.bytes_in_sequence);
                    i = this.bytes_remaining - 1;
                    this.state = TokenizerStates.STRING_DEFAULT;
                    continue;
                case TokenizerStates.STRING_AFTER_BACKSLASH:
                    const controlChar = utf_8_1.escapedSequences[n];
                    if (controlChar) {
                        this.bufferedString.appendChar(controlChar);
                        this.state = TokenizerStates.STRING_DEFAULT;
                        continue;
                    }
                    if (n === utf_8_1.charset.LATIN_SMALL_LETTER_U) {
                        this.unicode = "";
                        this.state = TokenizerStates.STRING_UNICODE_DIGIT_1;
                        continue;
                    }
                    break;
                case TokenizerStates.STRING_UNICODE_DIGIT_1:
                case TokenizerStates.STRING_UNICODE_DIGIT_2:
                case TokenizerStates.STRING_UNICODE_DIGIT_3:
                    if ((n >= utf_8_1.charset.DIGIT_ZERO && n <= utf_8_1.charset.DIGIT_NINE) ||
                        (n >= utf_8_1.charset.LATIN_CAPITAL_LETTER_A &&
                            n <= utf_8_1.charset.LATIN_CAPITAL_LETTER_F) ||
                        (n >= utf_8_1.charset.LATIN_SMALL_LETTER_A &&
                            n <= utf_8_1.charset.LATIN_SMALL_LETTER_F)) {
                        this.unicode += String.fromCharCode(n);
                        this.state += 1;
                        continue;
                    }
                    break;
                case TokenizerStates.STRING_UNICODE_DIGIT_4:
                    if ((n >= utf_8_1.charset.DIGIT_ZERO && n <= utf_8_1.charset.DIGIT_NINE) ||
                        (n >= utf_8_1.charset.LATIN_CAPITAL_LETTER_A &&
                            n <= utf_8_1.charset.LATIN_CAPITAL_LETTER_F) ||
                        (n >= utf_8_1.charset.LATIN_SMALL_LETTER_A &&
                            n <= utf_8_1.charset.LATIN_SMALL_LETTER_F)) {
                        const intVal = parseInt(this.unicode + String.fromCharCode(n), 16);
                        if (this.highSurrogate === undefined) {
                            if (intVal >= 0xd800 && intVal <= 0xdbff) {
                                //<55296,56319> - highSurrogate
                                this.highSurrogate = intVal;
                            }
                            else {
                                this.bufferedString.appendBuf(this.encoder.encode(String.fromCharCode(intVal)));
                            }
                        }
                        else {
                            if (intVal >= 0xdc00 && intVal <= 0xdfff) {
                                //<56320,57343> - lowSurrogate
                                this.bufferedString.appendBuf(this.encoder.encode(String.fromCharCode(this.highSurrogate, intVal)));
                            }
                            else {
                                this.bufferedString.appendBuf(this.encoder.encode(String.fromCharCode(this.highSurrogate)));
                            }
                            this.highSurrogate = undefined;
                        }
                        this.state = TokenizerStates.STRING_DEFAULT;
                        continue;
                    }
                // Number
                case TokenizerStates.NUMBER_AFTER_INITIAL_MINUS:
                    if (n === utf_8_1.charset.DIGIT_ZERO) {
                        this.bufferedNumber.appendChar(n);
                        this.state = TokenizerStates.NUMBER_AFTER_INITIAL_ZERO;
                        continue;
                    }
                    if (n >= utf_8_1.charset.DIGIT_ONE && n <= utf_8_1.charset.DIGIT_NINE) {
                        this.bufferedNumber.appendChar(n);
                        this.state = TokenizerStates.NUMBER_AFTER_INITIAL_NON_ZERO;
                        continue;
                    }
                    break;
                case TokenizerStates.NUMBER_AFTER_INITIAL_ZERO:
                    if (n === utf_8_1.charset.FULL_STOP) {
                        this.bufferedNumber.appendChar(n);
                        this.state = TokenizerStates.NUMBER_AFTER_FULL_STOP;
                        continue;
                    }
                    if (n === utf_8_1.charset.LATIN_SMALL_LETTER_E ||
                        n === utf_8_1.charset.LATIN_CAPITAL_LETTER_E) {
                        this.bufferedNumber.appendChar(n);
                        this.state = TokenizerStates.NUMBER_AFTER_E;
                        continue;
                    }
                    i -= 1;
                    this.state = TokenizerStates.START;
                    this.emitNumber();
                    continue;
                case TokenizerStates.NUMBER_AFTER_INITIAL_NON_ZERO:
                    if (n >= utf_8_1.charset.DIGIT_ZERO && n <= utf_8_1.charset.DIGIT_NINE) {
                        this.bufferedNumber.appendChar(n);
                        continue;
                    }
                    if (n === utf_8_1.charset.FULL_STOP) {
                        this.bufferedNumber.appendChar(n);
                        this.state = TokenizerStates.NUMBER_AFTER_FULL_STOP;
                        continue;
                    }
                    if (n === utf_8_1.charset.LATIN_SMALL_LETTER_E ||
                        n === utf_8_1.charset.LATIN_CAPITAL_LETTER_E) {
                        this.bufferedNumber.appendChar(n);
                        this.state = TokenizerStates.NUMBER_AFTER_E;
                        continue;
                    }
                    i -= 1;
                    this.state = TokenizerStates.START;
                    this.emitNumber();
                    continue;
                case TokenizerStates.NUMBER_AFTER_FULL_STOP:
                    if (n >= utf_8_1.charset.DIGIT_ZERO && n <= utf_8_1.charset.DIGIT_NINE) {
                        this.bufferedNumber.appendChar(n);
                        this.state = TokenizerStates.NUMBER_AFTER_DECIMAL;
                        continue;
                    }
                    break;
                case TokenizerStates.NUMBER_AFTER_DECIMAL:
                    if (n >= utf_8_1.charset.DIGIT_ZERO && n <= utf_8_1.charset.DIGIT_NINE) {
                        this.bufferedNumber.appendChar(n);
                        continue;
                    }
                    if (n === utf_8_1.charset.LATIN_SMALL_LETTER_E ||
                        n === utf_8_1.charset.LATIN_CAPITAL_LETTER_E) {
                        this.bufferedNumber.appendChar(n);
                        this.state = TokenizerStates.NUMBER_AFTER_E;
                        continue;
                    }
                    i -= 1;
                    this.state = TokenizerStates.START;
                    this.emitNumber();
                    continue;
                case TokenizerStates.NUMBER_AFTER_E:
                    if (n === utf_8_1.charset.PLUS_SIGN || n === utf_8_1.charset.HYPHEN_MINUS) {
                        this.bufferedNumber.appendChar(n);
                        this.state = TokenizerStates.NUMBER_AFTER_E_AND_SIGN;
                        continue;
                    }
                // Allow cascading
                case TokenizerStates.NUMBER_AFTER_E_AND_SIGN:
                    if (n >= utf_8_1.charset.DIGIT_ZERO && n <= utf_8_1.charset.DIGIT_NINE) {
                        this.bufferedNumber.appendChar(n);
                        this.state = TokenizerStates.NUMBER_AFTER_E_AND_DIGIT;
                        continue;
                    }
                    break;
                case TokenizerStates.NUMBER_AFTER_E_AND_DIGIT:
                    if (n >= utf_8_1.charset.DIGIT_ZERO && n <= utf_8_1.charset.DIGIT_NINE) {
                        this.bufferedNumber.appendChar(n);
                        continue;
                    }
                    i -= 1;
                    this.state = TokenizerStates.START;
                    this.emitNumber();
                    continue;
                // TRUE
                case TokenizerStates.TRUE1:
                    if (n === utf_8_1.charset.LATIN_SMALL_LETTER_R) {
                        this.state = TokenizerStates.TRUE2;
                        continue;
                    }
                    break;
                case TokenizerStates.TRUE2:
                    if (n === utf_8_1.charset.LATIN_SMALL_LETTER_U) {
                        this.state = TokenizerStates.TRUE3;
                        continue;
                    }
                    break;
                case TokenizerStates.TRUE3:
                    if (n === utf_8_1.charset.LATIN_SMALL_LETTER_E) {
                        this.state = TokenizerStates.START;
                        this.onToken(TRUE, true, this.offset);
                        this.offset += 3;
                        continue;
                    }
                    break;
                // FALSE
                case TokenizerStates.FALSE1:
                    if (n === utf_8_1.charset.LATIN_SMALL_LETTER_A) {
                        this.state = TokenizerStates.FALSE2;
                        continue;
                    }
                    break;
                case TokenizerStates.FALSE2:
                    if (n === utf_8_1.charset.LATIN_SMALL_LETTER_L) {
                        this.state = TokenizerStates.FALSE3;
                        continue;
                    }
                    break;
                case TokenizerStates.FALSE3:
                    if (n === utf_8_1.charset.LATIN_SMALL_LETTER_S) {
                        this.state = TokenizerStates.FALSE4;
                        continue;
                    }
                    break;
                case TokenizerStates.FALSE4:
                    if (n === utf_8_1.charset.LATIN_SMALL_LETTER_E) {
                        this.state = TokenizerStates.START;
                        this.onToken(FALSE, false, this.offset);
                        this.offset += 4;
                        continue;
                    }
                    break;
                // NULL
                case TokenizerStates.NULL1:
                    if (n === utf_8_1.charset.LATIN_SMALL_LETTER_U) {
                        this.state = TokenizerStates.NULL2;
                        continue;
                    }
                    break;
                case TokenizerStates.NULL2:
                    if (n === utf_8_1.charset.LATIN_SMALL_LETTER_L) {
                        this.state = TokenizerStates.NULL3;
                        continue;
                    }
                    break;
                case TokenizerStates.NULL3:
                    if (n === utf_8_1.charset.LATIN_SMALL_LETTER_L) {
                        this.state = TokenizerStates.START;
                        this.onToken(NULL, null, this.offset);
                        this.offset += 3;
                        continue;
                    }
                    break;
                case TokenizerStates.SEPARATOR:
                    this.separatorIndex += 1;
                    if (!this.separatorBytes ||
                        n !== this.separatorBytes[this.separatorIndex]) {
                        break;
                    }
                    if (this.separatorIndex === this.separatorBytes.length - 1) {
                        this.state = TokenizerStates.START;
                        this.onToken(constants_1.TokenType.SEPARATOR, this.separator, this.offset + this.separatorIndex);
                        this.separatorIndex = 0;
                    }
                    continue;
                case TokenizerStates.ENDED:
                    if (n === utf_8_1.charset.SPACE ||
                        n === utf_8_1.charset.NEWLINE ||
                        n === utf_8_1.charset.CARRIAGE_RETURN ||
                        n === utf_8_1.charset.TAB) {
                        // whitespace
                        continue;
                    }
            }
            this.error(new TokenizerError(`Unexpected "${String.fromCharCode(n)}" at position "${i}" in state ${TokenizerStates[this.state]}`));
            return;
        }
    }
    emitNumber() {
        this.onToken(NUMBER, this.parseNumber(this.bufferedNumber.toString()), this.offset);
        this.offset += this.bufferedNumber.byteLength - 1;
    }
    parseNumber(numberStr) {
        return Number(numberStr);
    }
    error(err) {
        if (this.state !== TokenizerStates.ENDED) {
            this.state = TokenizerStates.ERROR;
        }
        this.onError(err);
    }
    end() {
        switch (this.state) {
            case TokenizerStates.NUMBER_AFTER_INITIAL_ZERO:
            case TokenizerStates.NUMBER_AFTER_INITIAL_NON_ZERO:
            case TokenizerStates.NUMBER_AFTER_DECIMAL:
            case TokenizerStates.NUMBER_AFTER_E_AND_DIGIT:
                this.state = TokenizerStates.ENDED;
                this.emitNumber();
                this.onEnd();
                break;
            case TokenizerStates.START:
            case TokenizerStates.ERROR:
            case TokenizerStates.SEPARATOR:
                this.state = TokenizerStates.ENDED;
                this.onEnd();
                break;
            default:
                this.error(new TokenizerError(`Tokenizer ended in the middle of a token (state: ${TokenizerStates[this.state]}). Either not all the data was received or the data was invalid.`));
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onToken(token, value, offset) {
        // Override me
        throw new TokenizerError('Can\'t emit tokens before the "onToken" callback has been set up.');
    }
    onError(err) {
        // Override me
        throw err;
    }
    onEnd() {
        // Override me
    }
}
exports["default"] = Tokenizer;


/***/ }),

/***/ 861:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TokenParserError = exports.TokenParserMode = void 0;
const constants_1 = __nccwpck_require__(407);
const { LEFT_BRACE, RIGHT_BRACE, LEFT_BRACKET, RIGHT_BRACKET, COLON, COMMA, TRUE, FALSE, NULL, STRING, NUMBER, SEPARATOR, } = constants_1.TokenType;
// Parser States
var TokenParserState;
(function (TokenParserState) {
    TokenParserState[TokenParserState["VALUE"] = 0] = "VALUE";
    TokenParserState[TokenParserState["KEY"] = 1] = "KEY";
    TokenParserState[TokenParserState["COLON"] = 2] = "COLON";
    TokenParserState[TokenParserState["COMMA"] = 3] = "COMMA";
    TokenParserState[TokenParserState["ENDED"] = 4] = "ENDED";
    TokenParserState[TokenParserState["ERROR"] = 5] = "ERROR";
    TokenParserState[TokenParserState["SEPARATOR"] = 6] = "SEPARATOR";
})(TokenParserState || (TokenParserState = {}));
// Parser Modes
var TokenParserMode;
(function (TokenParserMode) {
    TokenParserMode[TokenParserMode["OBJECT"] = 0] = "OBJECT";
    TokenParserMode[TokenParserMode["ARRAY"] = 1] = "ARRAY";
})(TokenParserMode = exports.TokenParserMode || (exports.TokenParserMode = {}));
const defaultOpts = {
    paths: undefined,
    keepStack: true,
    separator: undefined,
};
class TokenParserError extends Error {
    constructor(message) {
        super(message);
        // Typescript is broken. This is a workaround
        Object.setPrototypeOf(this, TokenParserError.prototype);
    }
}
exports.TokenParserError = TokenParserError;
class TokenParser {
    constructor(opts) {
        this.state = TokenParserState.VALUE;
        this.mode = undefined;
        this.key = undefined;
        this.value = undefined;
        this.stack = [];
        opts = Object.assign(Object.assign({}, defaultOpts), opts);
        if (opts.paths) {
            this.paths = opts.paths.map((path) => {
                if (path === undefined || path === "$*")
                    return undefined;
                if (!path.startsWith("$"))
                    throw new TokenParserError(`Invalid selector "${path}". Should start with "$".`);
                const pathParts = path.split(".").slice(1);
                if (pathParts.includes(""))
                    throw new TokenParserError(`Invalid selector "${path}". ".." syntax not supported.`);
                return pathParts;
            });
        }
        this.keepStack = opts.keepStack;
        this.separator = opts.separator;
    }
    shouldEmit() {
        if (!this.paths)
            return true;
        return this.paths.some((path) => {
            var _a;
            if (path === undefined)
                return true;
            if (path.length !== this.stack.length)
                return false;
            for (let i = 0; i < path.length - 1; i++) {
                const selector = path[i];
                const key = this.stack[i + 1].key;
                if (selector === "*")
                    continue;
                if (selector !== key)
                    return false;
            }
            const selector = path[path.length - 1];
            if (selector === "*")
                return true;
            return selector === ((_a = this.key) === null || _a === void 0 ? void 0 : _a.toString());
        });
    }
    push() {
        this.stack.push({
            key: this.key,
            value: this.value,
            mode: this.mode,
            emit: this.shouldEmit(),
        });
    }
    pop() {
        const value = this.value;
        let emit;
        ({
            key: this.key,
            value: this.value,
            mode: this.mode,
            emit,
        } = this.stack.pop());
        this.state =
            this.mode !== undefined ? TokenParserState.COMMA : TokenParserState.VALUE;
        this.emit(value, emit);
    }
    emit(value, emit) {
        if (!this.keepStack &&
            this.value &&
            this.stack.every((item) => !item.emit)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete this.value[this.key];
        }
        if (emit) {
            this.onValue(value, 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.key, 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.value, this.stack);
        }
        if (this.stack.length === 0) {
            if (this.separator) {
                this.state = TokenParserState.SEPARATOR;
            }
            else if (this.separator === undefined) {
                this.end();
            }
            // else if separator === '', expect next JSON object.
        }
    }
    get isEnded() {
        return this.state === TokenParserState.ENDED;
    }
    write(token, value) {
        if (this.state === TokenParserState.VALUE) {
            if (token === STRING ||
                token === NUMBER ||
                token === TRUE ||
                token === FALSE ||
                token === NULL) {
                if (this.mode === TokenParserMode.OBJECT) {
                    this.value[this.key] = value;
                    this.state = TokenParserState.COMMA;
                }
                else if (this.mode === TokenParserMode.ARRAY) {
                    this.value.push(value);
                    this.state = TokenParserState.COMMA;
                }
                this.emit(value, this.shouldEmit());
                return;
            }
            if (token === LEFT_BRACE) {
                this.push();
                if (this.mode === TokenParserMode.OBJECT) {
                    this.value = this.value[this.key] = {};
                }
                else if (this.mode === TokenParserMode.ARRAY) {
                    const val = {};
                    this.value.push(val);
                    this.value = val;
                }
                else {
                    this.value = {};
                }
                this.mode = TokenParserMode.OBJECT;
                this.state = TokenParserState.KEY;
                this.key = undefined;
                return;
            }
            if (token === LEFT_BRACKET) {
                this.push();
                if (this.mode === TokenParserMode.OBJECT) {
                    this.value = this.value[this.key] = [];
                }
                else if (this.mode === TokenParserMode.ARRAY) {
                    const val = [];
                    this.value.push(val);
                    this.value = val;
                }
                else {
                    this.value = [];
                }
                this.mode = TokenParserMode.ARRAY;
                this.state = TokenParserState.VALUE;
                this.key = 0;
                return;
            }
            if (this.mode === TokenParserMode.ARRAY &&
                token === RIGHT_BRACKET &&
                this.value.length === 0) {
                this.pop();
                return;
            }
        }
        if (this.state === TokenParserState.KEY) {
            if (token === STRING) {
                this.key = value;
                this.state = TokenParserState.COLON;
                return;
            }
            if (token === RIGHT_BRACE &&
                Object.keys(this.value).length === 0) {
                this.pop();
                return;
            }
        }
        if (this.state === TokenParserState.COLON) {
            if (token === COLON) {
                this.state = TokenParserState.VALUE;
                return;
            }
        }
        if (this.state === TokenParserState.COMMA) {
            if (token === COMMA) {
                if (this.mode === TokenParserMode.ARRAY) {
                    this.state = TokenParserState.VALUE;
                    this.key += 1;
                    return;
                }
                /* istanbul ignore else */
                if (this.mode === TokenParserMode.OBJECT) {
                    this.state = TokenParserState.KEY;
                    return;
                }
            }
            if ((token === RIGHT_BRACE && this.mode === TokenParserMode.OBJECT) ||
                (token === RIGHT_BRACKET && this.mode === TokenParserMode.ARRAY)) {
                this.pop();
                return;
            }
        }
        if (this.state === TokenParserState.SEPARATOR) {
            if (token === SEPARATOR && value === this.separator) {
                this.state = TokenParserState.VALUE;
                return;
            }
        }
        this.error(new TokenParserError(`Unexpected ${constants_1.TokenType[token]} (${JSON.stringify(value)}) in state ${TokenParserState[this.state]}`));
    }
    error(err) {
        if (this.state !== TokenParserState.ENDED) {
            this.state = TokenParserState.ERROR;
        }
        this.onError(err);
    }
    end() {
        if ((this.state !== TokenParserState.VALUE &&
            this.state !== TokenParserState.SEPARATOR) ||
            this.stack.length > 0) {
            this.error(new Error(`Parser ended in mid-parsing (state: ${TokenParserState[this.state]}). Either not all the data was received or the data was invalid.`));
        }
        else {
            this.state = TokenParserState.ENDED;
            this.onEnd();
        }
    }
    onValue(
    /* eslint-disable @typescript-eslint/no-unused-vars */
    value, key, parent, stack
    /* eslint-enable @typescript-eslint/no-unused-vars */
    ) {
        // Override me
        throw new TokenParserError('Can\'t emit data before the "onValue" callback has been set up.');
    }
    onError(err) {
        // Override me
        throw err;
    }
    onEnd() {
        // Override me
    }
}
exports["default"] = TokenParser;


/***/ }),

/***/ 945:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BufferedString = exports.NonBufferedString = void 0;
class NonBufferedString {
    constructor() {
        this.decoder = new TextDecoder("utf-8");
        this.string = "";
        this.byteLength = 0;
    }
    appendChar(char) {
        this.string += String.fromCharCode(char);
        this.byteLength += 1;
    }
    appendBuf(buf, start = 0, end = buf.length) {
        this.string += this.decoder.decode(buf.subarray(start, end));
        this.byteLength += end - start;
    }
    reset() {
        this.string = "";
        this.byteLength = 0;
    }
    toString() {
        return this.string;
    }
}
exports.NonBufferedString = NonBufferedString;
class BufferedString {
    constructor(bufferSize) {
        this.decoder = new TextDecoder("utf-8");
        this.bufferOffset = 0;
        this.string = "";
        this.byteLength = 0;
        this.buffer = new Uint8Array(bufferSize);
    }
    appendChar(char) {
        if (this.bufferOffset >= this.buffer.length)
            this.flushStringBuffer();
        this.buffer[this.bufferOffset++] = char;
        this.byteLength += 1;
    }
    appendBuf(buf, start = 0, end = buf.length) {
        const size = end - start;
        if (this.bufferOffset + size > this.buffer.length)
            this.flushStringBuffer();
        this.buffer.set(buf.subarray(start, end), this.bufferOffset);
        this.bufferOffset += size;
        this.byteLength += size;
    }
    flushStringBuffer() {
        this.string += this.decoder.decode(this.buffer.subarray(0, this.bufferOffset));
        this.bufferOffset = 0;
    }
    reset() {
        this.string = "";
        this.bufferOffset = 0;
        this.byteLength = 0;
    }
    toString() {
        this.flushStringBuffer();
        return this.string;
    }
}
exports.BufferedString = BufferedString;


/***/ }),

/***/ 407:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TokenType = void 0;
var TokenType;
(function (TokenType) {
    TokenType[TokenType["LEFT_BRACE"] = 1] = "LEFT_BRACE";
    TokenType[TokenType["RIGHT_BRACE"] = 2] = "RIGHT_BRACE";
    TokenType[TokenType["LEFT_BRACKET"] = 3] = "LEFT_BRACKET";
    TokenType[TokenType["RIGHT_BRACKET"] = 4] = "RIGHT_BRACKET";
    TokenType[TokenType["COLON"] = 5] = "COLON";
    TokenType[TokenType["COMMA"] = 6] = "COMMA";
    TokenType[TokenType["TRUE"] = 7] = "TRUE";
    TokenType[TokenType["FALSE"] = 8] = "FALSE";
    TokenType[TokenType["NULL"] = 9] = "NULL";
    TokenType[TokenType["STRING"] = 10] = "STRING";
    TokenType[TokenType["NUMBER"] = 11] = "NUMBER";
    TokenType[TokenType["SEPARATOR"] = 12] = "SEPARATOR";
})(TokenType = exports.TokenType || (exports.TokenType = {}));


/***/ }),

/***/ 493:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.escapedSequences = exports.charset = void 0;
var charset;
(function (charset) {
    charset[charset["BACKSPACE"] = 8] = "BACKSPACE";
    charset[charset["FORM_FEED"] = 12] = "FORM_FEED";
    charset[charset["NEWLINE"] = 10] = "NEWLINE";
    charset[charset["CARRIAGE_RETURN"] = 13] = "CARRIAGE_RETURN";
    charset[charset["TAB"] = 9] = "TAB";
    charset[charset["SPACE"] = 32] = "SPACE";
    charset[charset["EXCLAMATION_MARK"] = 33] = "EXCLAMATION_MARK";
    charset[charset["QUOTATION_MARK"] = 34] = "QUOTATION_MARK";
    charset[charset["NUMBER_SIGN"] = 35] = "NUMBER_SIGN";
    charset[charset["DOLLAR_SIGN"] = 36] = "DOLLAR_SIGN";
    charset[charset["PERCENT_SIGN"] = 37] = "PERCENT_SIGN";
    charset[charset["AMPERSAND"] = 38] = "AMPERSAND";
    charset[charset["APOSTROPHE"] = 39] = "APOSTROPHE";
    charset[charset["LEFT_PARENTHESIS"] = 40] = "LEFT_PARENTHESIS";
    charset[charset["RIGHT_PARENTHESIS"] = 41] = "RIGHT_PARENTHESIS";
    charset[charset["ASTERISK"] = 42] = "ASTERISK";
    charset[charset["PLUS_SIGN"] = 43] = "PLUS_SIGN";
    charset[charset["COMMA"] = 44] = "COMMA";
    charset[charset["HYPHEN_MINUS"] = 45] = "HYPHEN_MINUS";
    charset[charset["FULL_STOP"] = 46] = "FULL_STOP";
    charset[charset["SOLIDUS"] = 47] = "SOLIDUS";
    charset[charset["DIGIT_ZERO"] = 48] = "DIGIT_ZERO";
    charset[charset["DIGIT_ONE"] = 49] = "DIGIT_ONE";
    charset[charset["DIGIT_TWO"] = 50] = "DIGIT_TWO";
    charset[charset["DIGIT_THREE"] = 51] = "DIGIT_THREE";
    charset[charset["DIGIT_FOUR"] = 52] = "DIGIT_FOUR";
    charset[charset["DIGIT_FIVE"] = 53] = "DIGIT_FIVE";
    charset[charset["DIGIT_SIX"] = 54] = "DIGIT_SIX";
    charset[charset["DIGIT_SEVEN"] = 55] = "DIGIT_SEVEN";
    charset[charset["DIGIT_EIGHT"] = 56] = "DIGIT_EIGHT";
    charset[charset["DIGIT_NINE"] = 57] = "DIGIT_NINE";
    charset[charset["COLON"] = 58] = "COLON";
    charset[charset["SEMICOLON"] = 59] = "SEMICOLON";
    charset[charset["LESS_THAN_SIGN"] = 60] = "LESS_THAN_SIGN";
    charset[charset["EQUALS_SIGN"] = 61] = "EQUALS_SIGN";
    charset[charset["GREATER_THAN_SIGN"] = 62] = "GREATER_THAN_SIGN";
    charset[charset["QUESTION_MARK"] = 63] = "QUESTION_MARK";
    charset[charset["COMMERCIAL_AT"] = 64] = "COMMERCIAL_AT";
    charset[charset["LATIN_CAPITAL_LETTER_A"] = 65] = "LATIN_CAPITAL_LETTER_A";
    charset[charset["LATIN_CAPITAL_LETTER_B"] = 66] = "LATIN_CAPITAL_LETTER_B";
    charset[charset["LATIN_CAPITAL_LETTER_C"] = 67] = "LATIN_CAPITAL_LETTER_C";
    charset[charset["LATIN_CAPITAL_LETTER_D"] = 68] = "LATIN_CAPITAL_LETTER_D";
    charset[charset["LATIN_CAPITAL_LETTER_E"] = 69] = "LATIN_CAPITAL_LETTER_E";
    charset[charset["LATIN_CAPITAL_LETTER_F"] = 70] = "LATIN_CAPITAL_LETTER_F";
    charset[charset["LATIN_CAPITAL_LETTER_G"] = 71] = "LATIN_CAPITAL_LETTER_G";
    charset[charset["LATIN_CAPITAL_LETTER_H"] = 72] = "LATIN_CAPITAL_LETTER_H";
    charset[charset["LATIN_CAPITAL_LETTER_I"] = 73] = "LATIN_CAPITAL_LETTER_I";
    charset[charset["LATIN_CAPITAL_LETTER_J"] = 74] = "LATIN_CAPITAL_LETTER_J";
    charset[charset["LATIN_CAPITAL_LETTER_K"] = 75] = "LATIN_CAPITAL_LETTER_K";
    charset[charset["LATIN_CAPITAL_LETTER_L"] = 76] = "LATIN_CAPITAL_LETTER_L";
    charset[charset["LATIN_CAPITAL_LETTER_M"] = 77] = "LATIN_CAPITAL_LETTER_M";
    charset[charset["LATIN_CAPITAL_LETTER_N"] = 78] = "LATIN_CAPITAL_LETTER_N";
    charset[charset["LATIN_CAPITAL_LETTER_O"] = 79] = "LATIN_CAPITAL_LETTER_O";
    charset[charset["LATIN_CAPITAL_LETTER_P"] = 80] = "LATIN_CAPITAL_LETTER_P";
    charset[charset["LATIN_CAPITAL_LETTER_Q"] = 81] = "LATIN_CAPITAL_LETTER_Q";
    charset[charset["LATIN_CAPITAL_LETTER_R"] = 82] = "LATIN_CAPITAL_LETTER_R";
    charset[charset["LATIN_CAPITAL_LETTER_S"] = 83] = "LATIN_CAPITAL_LETTER_S";
    charset[charset["LATIN_CAPITAL_LETTER_T"] = 84] = "LATIN_CAPITAL_LETTER_T";
    charset[charset["LATIN_CAPITAL_LETTER_U"] = 85] = "LATIN_CAPITAL_LETTER_U";
    charset[charset["LATIN_CAPITAL_LETTER_V"] = 86] = "LATIN_CAPITAL_LETTER_V";
    charset[charset["LATIN_CAPITAL_LETTER_W"] = 87] = "LATIN_CAPITAL_LETTER_W";
    charset[charset["LATIN_CAPITAL_LETTER_X"] = 88] = "LATIN_CAPITAL_LETTER_X";
    charset[charset["LATIN_CAPITAL_LETTER_Y"] = 89] = "LATIN_CAPITAL_LETTER_Y";
    charset[charset["LATIN_CAPITAL_LETTER_Z"] = 90] = "LATIN_CAPITAL_LETTER_Z";
    charset[charset["LEFT_SQUARE_BRACKET"] = 91] = "LEFT_SQUARE_BRACKET";
    charset[charset["REVERSE_SOLIDUS"] = 92] = "REVERSE_SOLIDUS";
    charset[charset["RIGHT_SQUARE_BRACKET"] = 93] = "RIGHT_SQUARE_BRACKET";
    charset[charset["CIRCUMFLEX_ACCENT"] = 94] = "CIRCUMFLEX_ACCENT";
    charset[charset["LOW_LINE"] = 95] = "LOW_LINE";
    charset[charset["GRAVE_ACCENT"] = 96] = "GRAVE_ACCENT";
    charset[charset["LATIN_SMALL_LETTER_A"] = 97] = "LATIN_SMALL_LETTER_A";
    charset[charset["LATIN_SMALL_LETTER_B"] = 98] = "LATIN_SMALL_LETTER_B";
    charset[charset["LATIN_SMALL_LETTER_C"] = 99] = "LATIN_SMALL_LETTER_C";
    charset[charset["LATIN_SMALL_LETTER_D"] = 100] = "LATIN_SMALL_LETTER_D";
    charset[charset["LATIN_SMALL_LETTER_E"] = 101] = "LATIN_SMALL_LETTER_E";
    charset[charset["LATIN_SMALL_LETTER_F"] = 102] = "LATIN_SMALL_LETTER_F";
    charset[charset["LATIN_SMALL_LETTER_G"] = 103] = "LATIN_SMALL_LETTER_G";
    charset[charset["LATIN_SMALL_LETTER_H"] = 104] = "LATIN_SMALL_LETTER_H";
    charset[charset["LATIN_SMALL_LETTER_I"] = 105] = "LATIN_SMALL_LETTER_I";
    charset[charset["LATIN_SMALL_LETTER_J"] = 106] = "LATIN_SMALL_LETTER_J";
    charset[charset["LATIN_SMALL_LETTER_K"] = 107] = "LATIN_SMALL_LETTER_K";
    charset[charset["LATIN_SMALL_LETTER_L"] = 108] = "LATIN_SMALL_LETTER_L";
    charset[charset["LATIN_SMALL_LETTER_M"] = 109] = "LATIN_SMALL_LETTER_M";
    charset[charset["LATIN_SMALL_LETTER_N"] = 110] = "LATIN_SMALL_LETTER_N";
    charset[charset["LATIN_SMALL_LETTER_O"] = 111] = "LATIN_SMALL_LETTER_O";
    charset[charset["LATIN_SMALL_LETTER_P"] = 112] = "LATIN_SMALL_LETTER_P";
    charset[charset["LATIN_SMALL_LETTER_Q"] = 113] = "LATIN_SMALL_LETTER_Q";
    charset[charset["LATIN_SMALL_LETTER_R"] = 114] = "LATIN_SMALL_LETTER_R";
    charset[charset["LATIN_SMALL_LETTER_S"] = 115] = "LATIN_SMALL_LETTER_S";
    charset[charset["LATIN_SMALL_LETTER_T"] = 116] = "LATIN_SMALL_LETTER_T";
    charset[charset["LATIN_SMALL_LETTER_U"] = 117] = "LATIN_SMALL_LETTER_U";
    charset[charset["LATIN_SMALL_LETTER_V"] = 118] = "LATIN_SMALL_LETTER_V";
    charset[charset["LATIN_SMALL_LETTER_W"] = 119] = "LATIN_SMALL_LETTER_W";
    charset[charset["LATIN_SMALL_LETTER_X"] = 120] = "LATIN_SMALL_LETTER_X";
    charset[charset["LATIN_SMALL_LETTER_Y"] = 121] = "LATIN_SMALL_LETTER_Y";
    charset[charset["LATIN_SMALL_LETTER_Z"] = 122] = "LATIN_SMALL_LETTER_Z";
    charset[charset["LEFT_CURLY_BRACKET"] = 123] = "LEFT_CURLY_BRACKET";
    charset[charset["VERTICAL_LINE"] = 124] = "VERTICAL_LINE";
    charset[charset["RIGHT_CURLY_BRACKET"] = 125] = "RIGHT_CURLY_BRACKET";
    charset[charset["TILDE"] = 126] = "TILDE";
})(charset = exports.charset || (exports.charset = {}));
exports.escapedSequences = {
    [charset.QUOTATION_MARK]: charset.QUOTATION_MARK,
    [charset.REVERSE_SOLIDUS]: charset.REVERSE_SOLIDUS,
    [charset.SOLIDUS]: charset.SOLIDUS,
    [charset.LATIN_SMALL_LETTER_B]: charset.BACKSPACE,
    [charset.LATIN_SMALL_LETTER_F]: charset.FORM_FEED,
    [charset.LATIN_SMALL_LETTER_N]: charset.NEWLINE,
    [charset.LATIN_SMALL_LETTER_R]: charset.CARRIAGE_RETURN,
    [charset.LATIN_SMALL_LETTER_T]: charset.TAB,
};


/***/ }),

/***/ 466:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { Readable } = __nccwpck_require__(781);
const JSON2CSVTransform = __nccwpck_require__(535);

class JSON2CSVAsyncParser {
  constructor(opts, transformOpts) {
    this.opts = opts;
    this.transformOpts = transformOpts;
  }

  /**
   * Main function that converts json to csv.
   *
   * @param {Stream|Array|Object} data Array of JSON objects to be converted to CSV
   * @returns {Stream} A stream producing the CSV formated data as a string
   */
  parse(data) {
    if (typeof data === 'string' || ArrayBuffer.isView(data)) {
      data = Readable.from(data, { objectMode: false });
    } else if (Array.isArray(data)) {
      data = Readable.from(data.filter(item => item !== null));
    } else if (typeof data === 'object' && !(data instanceof Readable)) {
      data = Readable.from([data]);
    }
    
    if (!(data instanceof Readable)) {
      throw new Error('Data should be a JSON object, JSON array, typed array, string or stream');
    }

    return data.pipe(new JSON2CSVTransform(this.opts, { objectMode: data.readableObjectMode, ...this.transformOpts }));
  }
}

module.exports = JSON2CSVAsyncParser;


/***/ }),

/***/ 562:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const os = __nccwpck_require__(37);
const lodashGet = __nccwpck_require__(903);
const { getProp } = __nccwpck_require__(425);
const defaultFormatter = __nccwpck_require__(357);
const numberFormatterCtor = __nccwpck_require__(198)
const stringFormatterCtor = __nccwpck_require__(836);
const symbolFormatterCtor = __nccwpck_require__(167);
const objectFormatterCtor = __nccwpck_require__(936);

class JSON2CSVBase {
  constructor(opts) {
    this.opts = this.preprocessOpts(opts);
  }

  /**
   * Check passing opts and set defaults.
   *
   * @param {Json2CsvOptions} opts Options object containing fields,
   * delimiter, default value, quote mark, header, etc.
   */
  preprocessOpts(opts) {
    const processedOpts = Object.assign({}, opts);

    if (processedOpts.fields) {
      processedOpts.fields = this.preprocessFieldsInfo(processedOpts.fields, processedOpts.defaultValue);
    }

    processedOpts.transforms = processedOpts.transforms || [];

    const stringFormatter = (processedOpts.formatters && processedOpts.formatters['string']) || stringFormatterCtor();
    const objectFormatter = objectFormatterCtor({ stringFormatter });    
    const defaultFormatters = {
      header: stringFormatter,
      undefined: defaultFormatter,
      boolean: defaultFormatter,
      number: numberFormatterCtor(),
      bigint: defaultFormatter,
      string: stringFormatter,
      symbol: symbolFormatterCtor({ stringFormatter }),
      function: objectFormatter,
      object: objectFormatter
    };

    processedOpts.formatters = {
      ...defaultFormatters,
      ...processedOpts.formatters,
    };

    processedOpts.delimiter = processedOpts.delimiter || ',';
    processedOpts.eol = processedOpts.eol || os.EOL;
    processedOpts.header = processedOpts.header !== false;
    processedOpts.includeEmptyRows = processedOpts.includeEmptyRows || false;
    processedOpts.withBOM = processedOpts.withBOM || false;

    return processedOpts;
  }

  /**
   * Check and normalize the fields configuration.
   *
   * @param {(string|object)[]} fields Fields configuration provided by the user
   * or inferred from the data
   * @returns {object[]} preprocessed FieldsInfo array
   */
  preprocessFieldsInfo(fields, globalDefaultValue) {
    return fields.map((fieldInfo) => {
      if (typeof fieldInfo === 'string') {
        return {
          label: fieldInfo,
          value: (fieldInfo.includes('.') || fieldInfo.includes('['))
            ? row => lodashGet(row, fieldInfo, globalDefaultValue)
            : row => getProp(row, fieldInfo, globalDefaultValue),
        };
      }

      if (typeof fieldInfo === 'object') {
        const defaultValue = 'default' in fieldInfo
          ? fieldInfo.default
          : globalDefaultValue;

        if (typeof fieldInfo.value === 'string') {
          return {
            label: fieldInfo.label || fieldInfo.value,
            value: (fieldInfo.value.includes('.') || fieldInfo.value.includes('['))
              ? row => lodashGet(row, fieldInfo.value, defaultValue)
              : row => getProp(row, fieldInfo.value, defaultValue),
          };
        }

        if (typeof fieldInfo.value === 'function') {
          const label = fieldInfo.label || fieldInfo.value.name || '';
          const field = { label, default: defaultValue };
          return {
            label,
            value(row) {
              const value = fieldInfo.value(row, field);
              return (value === null || value === undefined)
                ? defaultValue
                : value;
            },
          }
        }
      }

      throw new Error('Invalid field info option. ' + JSON.stringify(fieldInfo));
    });
  }

  /**
   * Create the title row with all the provided fields as column headings
   *
   * @returns {String} titles as a string
   */
  getHeader(fields) {
    return fields
      .map(fieldInfo => this.opts.formatters.header(fieldInfo.label))
      .join(this.opts.delimiter);
  }

  /**
   * Preprocess each object according to the given transforms (unwind, flatten, etc.).
   * @param {Object} row JSON object to be converted in a CSV row
   */
  preprocessRow(row) {
    return this.opts.transforms.reduce((rows, transform) =>
      rows.flatMap(row => transform(row)),
      [row]
    );
  }

  /**
   * Create the content of a specific CSV row
   *
   * @param {Object} row JSON object to be converted in a CSV row
   * @returns {String} CSV string (row)
   */
  processRow(row, fields) {
    if (!row) {
      return undefined;
    }

    const processedRow = fields.map(fieldInfo => this.processCell(row, fieldInfo));

    if (!this.opts.includeEmptyRows && processedRow.every(field => field === '')) {
      return undefined;
    }

    return processedRow.join(this.opts.delimiter);
  }

  /**
   * Create the content of a specfic CSV row cell
   *
   * @param {Object} row JSON object representing the  CSV row that the cell belongs to
   * @param {FieldInfo} fieldInfo Details of the field to process to be a CSV cell
   * @returns {String} CSV string (cell)
   */
  processCell(row, fieldInfo) {
    return this.processValue(fieldInfo.value(row));
  }

  /**
   * Create the content of a specfic CSV row cell
   *
   * @param {Any} value Value to be included in a CSV cell
   * @returns {String} Value stringified and processed
   */
  processValue(value) {
    return this.opts.formatters[typeof value](value);
  }
}

module.exports = JSON2CSVBase;


/***/ }),

/***/ 982:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const JSON2CSVBase = __nccwpck_require__(562);

class JSON2CSVParser extends JSON2CSVBase {
  constructor(opts) {
    super(opts);
  }
  /**
   * Main function that converts json to csv.
   *
   * @param {Array|Object} data Array of JSON objects to be converted to CSV
   * @returns {String} The CSV formated data as a string
   */
  parse(data) {
    const processedData = this.preprocessData(data, this.opts.fields);

    const fields = this.opts.fields || this.preprocessFieldsInfo(processedData
      .reduce((fields, item) => {
        Object.keys(item).forEach((field) => {
          if (!fields.includes(field)) {
            fields.push(field)
          }
        });

        return fields
      }, []));

    const header = this.opts.header ? this.getHeader(fields) : '';
    const rows = this.processData(processedData, fields);
    const csv = (this.opts.withBOM ? '\ufeff' : '')
      + header
      + ((header && rows) ? this.opts.eol : '')
      + rows;

    return csv;
  }

  /**
   * Preprocess the data according to the give opts (unwind, flatten, etc.)
    and calculate the fields and field names if they are not provided.
   *
   * @param {Array|Object} data Array or object to be converted to CSV
   */
  preprocessData(data, fields) {
    const processedData = Array.isArray(data) ? data : [data];

    if (!fields && (processedData.length === 0 || typeof processedData[0] !== 'object')) {
      throw new Error('Data should not be empty or the "fields" option should be included');
    }

    if (this.opts.transforms.length === 0) return processedData;

    return processedData
      .flatMap(row => this.preprocessRow(row));
  }

  /**
   * Create the content row by row below the header
   *
   * @param {Array} data Array of JSON objects to be converted to CSV
   * @returns {String} CSV string (body)
   */
  processData(data, fields) {
    return data
      .map(row => this.processRow(row, fields))
      .filter(row => row) // Filter empty rows
      .join(this.opts.eol);
  }
}

module.exports = JSON2CSVParser;


/***/ }),

/***/ 27:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const JSON2CSVBase = __nccwpck_require__(562);
const { Tokenizer, TokenParser, TokenType } = __nccwpck_require__(593);

class JSON2CSVStreamParser extends JSON2CSVBase {
  constructor(opts, asyncOpts) {
    super(opts);
    this.opts = this.preprocessOpts(opts);
    this.initTokenizer(opts, asyncOpts);
    if (this.opts.fields) this.preprocessFieldsInfo(this.opts.fields);
  }

  initTokenizer(opts = {}, asyncOpts = {}) {
    if (asyncOpts.objectMode) {
      this.tokenizer = this.getObjectModeTokenizer();
      return;
    }

    if (opts.ndjson) {
      this.tokenizer = this.getNdJsonTokenizer(asyncOpts);
      return;
    }

    this.tokenizer = this.getBinaryModeTokenizer(asyncOpts);
    return;
  }

  getObjectModeTokenizer() {
    return {
      write: (data) => this.pushLine(data),
      end: () => {
        this.pushHeaderIfNotWritten();
        this.onEnd();
      },
    };
  }

  configureCallbacks(tokenizer, tokenParser) {
    tokenizer.onToken = tokenParser.write.bind(this.tokenParser);
    tokenizer.onError = (err) => this.onError(err);
    tokenizer.onEnd = () => {
      if (!this.tokenParser.isEnded) this.tokenParser.end();
    };

    tokenParser.onValue = (value) => this.pushLine(value);
    tokenParser.onError = (err) => this.onError(err);
    tokenParser.onEnd = () => {
      this.pushHeaderIfNotWritten();
      this.onEnd();
    };
  }

  getNdJsonTokenizer(asyncOpts) {
    const tokenizer = new Tokenizer({ ...asyncOpts, separator: '\n' });
    this.tokenParser = new TokenParser({ paths: ['$'], keepStack: false, separator: '\n' });
    this.configureCallbacks(tokenizer, this.tokenParser);
    return tokenizer;
  }

  getBinaryModeTokenizer(asyncOpts) {
    const tokenizer = new Tokenizer(asyncOpts);
    tokenizer.onToken = (token, value, offset) => {
      if (token === TokenType.LEFT_BRACKET) {
        this.tokenParser = new TokenParser({ paths: ['$.*'], keepStack: false });
      } else if (token === TokenType.LEFT_BRACE) {
        this.tokenParser = new TokenParser({ paths: ['$'], keepStack: false });
      } else {
        this.onError(new Error('Data should be a JSON object or array'));
        return;
      }

      this.configureCallbacks(tokenizer, this.tokenParser);

      this.tokenParser.write(token, value, offset);
    };
    tokenizer.onError = () => this.onError(new Error('Data should be a JSON object or array'));
    tokenizer.onEnd = () => {
      this.onError(new Error('Data should not be empty or the "fields" option should be included'));
      this.onEnd();
    };
  
    return tokenizer;
  }

  write(data) {
    this.tokenizer.write(data);
  }

  end() {
    if (this.tokenizer && !this.tokenizer.isEnded) this.tokenizer.end();
  }

  pushHeaderIfNotWritten() {
    if (this._hasWritten) return;
    if (!this.opts.fields) {
      this.onError(new Error('Data should not be empty or the "fields" option should be included'));
      return;
    }

    this.pushHeader();
  }

  /**
   * Generate the csv header and pushes it downstream.
   */
  pushHeader() {
    if (this.opts.withBOM) {
      this.onData('\ufeff');
    }
  
    if (this.opts.header) {
      const header = this.getHeader(this.opts.fields);
      this.onHeader(header);
      this.onData(header);
      this._hasWritten = true;
    }
  }

  /**
   * Transforms an incoming json data to csv and pushes it downstream.
   *
   * @param {Object} data JSON object to be converted in a CSV row
   */
  pushLine(data) {
    const processedData = this.preprocessRow(data);
    
    if (!this._hasWritten) {
      this.opts.fields = this.preprocessFieldsInfo(this.opts.fields || Object.keys(processedData[0]));
      this.pushHeader(this.opts.fields);
    }

    processedData.forEach(row => {
      const line = this.processRow(row, this.opts.fields);
      if (line === undefined) return;
      this.onLine(line);
      this.onData(this._hasWritten ? this.opts.eol + line : line);
      this._hasWritten = true;
    });
  }

  // No idea why eslint doesn't detect the usage of these
  /* eslint-disable no-unused-vars */
  onHeader(header) {}
  onLine(line) {}
  onData(data) {}
  onError() {}
  onEnd() {}
  /* eslint-enable no-unused-vars */
}

module.exports = JSON2CSVStreamParser;


/***/ }),

/***/ 535:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { Transform } = __nccwpck_require__(781);
const JSON2CSVStreamParser = __nccwpck_require__(27);
const { fakeInherit } = __nccwpck_require__(425);

class JSON2CSVTransform extends Transform {
  constructor(opts, transformOpts = {}, asyncOptions = {}) {
    super(transformOpts);
    fakeInherit(this, JSON2CSVStreamParser);
    // To don't override the stream end method.
    this.endUnderlayingParser = JSON2CSVStreamParser.prototype.end;
    this.opts = this.preprocessOpts(opts);
    this.initTokenizer(opts, { ...asyncOptions, objectMode: transformOpts.objectMode || transformOpts.readableObjectMode });
    if (this.opts.fields) this.preprocessFieldsInfo(this.opts.fields);
  }

  onHeader(header) {
    this.emit('header', header);
  }

  onLine(line) {
    this.emit('line', line);
  }

  onData(data) {
    this.push(data);
  }

  onError(err) {
    throw err;
  }

  onEnd() {
    if (!this.writableEnded) this.end();
  }

  /**
   * Main function that send data to the parse to be processed.
   *
   * @param {Buffer} chunk Incoming data
   * @param {String} encoding Encoding of the incoming data. Defaults to 'utf8'
   * @param {Function} done Called when the proceesing of the supplied chunk is done
   */
  _transform(chunk, encoding, done) {
    try {
      this.tokenizer.write(chunk);
      done();
    } catch (err) {
      done(err);
    }
  }

  _final(done) {
    try {
      this.endUnderlayingParser();
      done();
    } catch (err) {
      done(err);
    }
  }

  promise() {
    return new Promise((resolve, reject) => {
      const csvBuffer = [];
      this
        .on('data', chunk => csvBuffer.push(chunk.toString()))
        .on('finish', () => resolve(csvBuffer.join('')))
        .on('error', err => reject(err));
    });
  }
}

module.exports = JSON2CSVTransform;


/***/ }),

/***/ 357:
/***/ ((module) => {

function defaultFormatter(value) {
  if (value === null || value === undefined) return '';

  return `${value}`;
}

module.exports = defaultFormatter;


/***/ }),

/***/ 198:
/***/ ((module) => {

function toFixedDecimals(value, decimals) {
  return value.toFixed(decimals);
}

function replaceSeparator(value, separator) {
  return value.replace('.', separator);
}


function numberFormatter(opts = {}) {
  if (opts.separator) {
    if (opts.decimals) {
      return (value) => replaceSeparator(toFixedDecimals(value, opts.decimals), opts.separator);
    }

    return (value) => replaceSeparator(value.toString(), opts.separator);
  }

  if (opts.decimals) {
    return (value) => toFixedDecimals(value, opts.decimals);
  }

  return (value) => value.toString();
}

module.exports = numberFormatter;


/***/ }),

/***/ 936:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const defaulStringFormatter = __nccwpck_require__(836);

function objectFormatter(opts = { stringFormatter: defaulStringFormatter() }) {
  return (value) => {
    if (value === null) return '';

    value = JSON.stringify(value);

    if (value === undefined) return '';

    if (value[0] === '"') value = value.replace(/^"(.+)"$/,'$1');

    return opts.stringFormatter(value);
  }
}

module.exports = objectFormatter;


/***/ }),

/***/ 836:
/***/ ((module) => {

function stringFormatter(opts = {}) {
  const quote = typeof opts.quote === 'string' ? opts.quote  : '"';
  const escapedQuote = typeof opts.escapedQuote === 'string' ? opts.escapedQuote : `${quote}${quote}`;

  if (!quote) {
    return (value) => value;
  }

  return (value) => {
    if(value.includes(quote)) {
      value = value.replace(new RegExp(quote, 'g'), escapedQuote);
    }

    return `${quote}${value}${quote}`;
  }
}

module.exports = stringFormatter;


/***/ }),

/***/ 373:
/***/ ((module) => {

const quote = '"';
const escapedQuote = '""""';

function stringExcel(value) {
  return `"=""${value.replace(new RegExp(quote, 'g'), escapedQuote)}"""`;
}

module.exports = stringExcel;


/***/ }),

/***/ 954:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const os = __nccwpck_require__(37);
const defaulStringFormatter = __nccwpck_require__(836);

function stringQuoteOnlyIfNecessaryFormatter(opts = {}) {
  const quote = typeof opts.quote === 'string' ? opts.quote  : '"';
  const escapedQuote = typeof opts.escapedQuote === 'string' ? opts.escapedQuote : `${quote}${quote}`;
  const separator = typeof opts.separator === 'string' ? opts.separator : ',';
  const eol = typeof opts.eol === 'string' ? opts.escapedQeoluote : os.EOL;

  const stringFormatter = defaulStringFormatter({ quote, escapedQuote });

  return (value) => {
    if([quote, separator, eol].some(char => value.includes(char))) {
      return stringFormatter(value);
    }

    return value;
  }
}

module.exports = stringQuoteOnlyIfNecessaryFormatter;


/***/ }),

/***/ 167:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const defaulStringFormatter = __nccwpck_require__(836);

function symbolFormatter(opts = { stringFormatter: defaulStringFormatter() }) {
  return (value) => opts.stringFormatter((value.toString().slice(7,-1)));
}

module.exports = symbolFormatter;


/***/ }),

/***/ 665:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
var __webpack_unused_export__;


const JSON2CSVParser = __nccwpck_require__(982);
const JSON2CSVAsyncParser = __nccwpck_require__(466);
const JSON2CSVStreamParser = __nccwpck_require__(27);
const JSON2CSVTransform = __nccwpck_require__(535);

// Transforms
const flatten = __nccwpck_require__(962);
const unwind = __nccwpck_require__(228);

// Formatters
const defaultFormatter = __nccwpck_require__(357);
const number = __nccwpck_require__(198);
const string = __nccwpck_require__(836);
const stringQuoteOnlyIfNecessary =  __nccwpck_require__(954);
const stringExcel = __nccwpck_require__(373);
const symbol = __nccwpck_require__(167);
const object = __nccwpck_require__(936);

__webpack_unused_export__ = JSON2CSVParser;
__webpack_unused_export__ = JSON2CSVAsyncParser;
__webpack_unused_export__ = JSON2CSVStreamParser;
__webpack_unused_export__ = JSON2CSVTransform;

// Convenience method to keep the API similar to version 3.X
module.exports.Qc = (data, opts) => new JSON2CSVParser(opts).parse(data);
__webpack_unused_export__ = (data, opts, transformOpts) => new JSON2CSVAsyncParser(opts, transformOpts).parse(data).promise();

__webpack_unused_export__ = {
  flatten,
  unwind,
};

__webpack_unused_export__ = {
  default: defaultFormatter,
  number,
  string,
  stringQuoteOnlyIfNecessary,
  stringExcel,
  symbol,
  object,
};


/***/ }),

/***/ 962:
/***/ ((module) => {

/**
 * Performs the flattening of a data row recursively
 *
 * @param {String} separator Separator to be used as the flattened field name
 * @returns {Object => Object} Flattened object
 */
function flatten({ objects = true, arrays = false, separator = '.' } = {}) {
  function step (obj, flatDataRow, currentPath) {
    Object.keys(obj).forEach((key) => {
      const newPath = currentPath ? `${currentPath}${separator}${key}` : key;
      const value = obj[key];

      if (objects
        && typeof value === 'object'
        && value !== null
        && !Array.isArray(value)
        && Object.prototype.toString.call(value.toJSON) !== '[object Function]'
        && Object.keys(value).length) {
        step(value, flatDataRow, newPath);
        return;
      }

      if (arrays && Array.isArray(value)) {
        step(value, flatDataRow, newPath);
        return;
      }
      
      flatDataRow[newPath] = value;
    });

    return flatDataRow;
  }

  return dataRow => step(dataRow, {});
}

module.exports = flatten;


/***/ }),

/***/ 228:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {


const lodashGet = __nccwpck_require__(903);
const { setProp, unsetProp } = __nccwpck_require__(425);

function getUnwindablePaths(obj, currentPath) {
  return Object.keys(obj).reduce((unwindablePaths, key) => {
    const newPath = currentPath ? `${currentPath}.${key}` : key;
    const value = obj[key];

    if (typeof value === 'object'
      && value !== null
      && !Array.isArray(value)
      && Object.prototype.toString.call(value.toJSON) !== '[object Function]'
      && Object.keys(value).length) {
      unwindablePaths = unwindablePaths.concat(getUnwindablePaths(value, newPath));
    } else if (Array.isArray(value)) {
      unwindablePaths.push(newPath);
      unwindablePaths = unwindablePaths.concat(value
        .flatMap(arrObj => getUnwindablePaths(arrObj, newPath))
        .filter((item, index, arr) => arr.indexOf(item) !== index));
    }

    return unwindablePaths;
  }, []);
}

/**
 * Performs the unwind recursively in specified sequence
 *
 * @param {String[]} unwindPaths The paths as strings to be used to deconstruct the array
 * @returns {Object => Array} Array of objects containing all rows after unwind of chosen paths
*/
function unwind({ paths = undefined, blankOut = false } = {}) {
  function unwindReducer(rows, unwindPath) {
    return rows
      .flatMap(row => {
        const unwindArray = lodashGet(row, unwindPath);

        if (!Array.isArray(unwindArray)) {
          return row;
        }

        if (!unwindArray.length) {
          return unsetProp(row, unwindPath);
        }

        const baseNewRow = blankOut ? {} : row;
        const [firstRow, ...restRows] = unwindArray;
        return [
          setProp(row, unwindPath, firstRow),
          ...restRows.map(unwindRow => setProp(baseNewRow, unwindPath, unwindRow))
        ];
      });
  }

  paths = Array.isArray(paths) ? paths : (paths ? [paths] : undefined);
  return dataRow => (paths || getUnwindablePaths(dataRow)).reduce(unwindReducer, [dataRow]);
}

module.exports = unwind;

/***/ }),

/***/ 425:
/***/ ((module) => {

"use strict";


function getProp(obj, path, defaultValue) {
  return obj[path] === undefined ? defaultValue : obj[path];
}

function setProp(obj, path, value) {
  const pathArray = Array.isArray(path) ? path : path.split('.');
  const [key, ...restPath] = pathArray;
  return {
    ...obj,
    [key]: pathArray.length > 1 ? setProp(obj[key] || {}, restPath, value) : value
  };
}

function unsetProp(obj, path) {
  const pathArray = Array.isArray(path) ? path : path.split('.');
  const [key, ...restPath] = pathArray;

  // This will never be hit in the current code because unwind does the check before calling unsetProp
  /* istanbul ignore next */
  if (typeof obj[key] !== 'object') {
    return obj;
  }

  if (pathArray.length === 1) {
    return Object.keys(obj)
      .filter(prop => prop !== key)
      .reduce((acc, prop) => ({ ...acc, [prop]: obj[prop] }), {});
  }

  return Object.keys(obj)
    .reduce((acc, prop) => ({
      ...acc,
      [prop]: prop !== key ? obj[prop] : unsetProp(obj[key], restPath),
    }), {});
}

/**
   * Function to manually make a given object inherit all the properties and methods
   * from another object.
   *
   * @param {Buffer} chunk Incoming data
   * @param {String} encoding Encoding of the incoming data. Defaults to 'utf8'
   * @param {Function} done Called when the proceesing of the supplied chunk is done
   */
function fakeInherit(inheritingObj, parentObj) {
  let current = parentObj.prototype;
  do {
    Object.getOwnPropertyNames(current)
    .filter((prop) => ![
        'constructor',
        '__proto__',
        '__defineGetter__',
        '__defineSetter__',
        '__lookupGetter__',
        '__lookupSetter__',
        'isPrototypeOf',
        'hasOwnProperty',
        'propertyIsEnumerable',
        'valueOf',
        'toString',
        'toLocaleString'
      ].includes(prop)
    )
    .forEach(prop => {
      if (!inheritingObj[prop]) {
        Object.defineProperty(inheritingObj, prop, Object.getOwnPropertyDescriptor(current, prop));
      }
    });
    // Bring back if we ever need to extend object with Symbol properties
    // Object.getOwnPropertySymbols(current).forEach(prop => {
    //   if (!inheritingObj[prop]) {
    //     Object.defineProperty(inheritingObj, prop, Object.getOwnPropertyDescriptor(current, prop));
    //   }
    // });
    current = Object.getPrototypeOf(current);
  } while (current != null);
}

module.exports = {
  getProp,
  setProp,
  unsetProp,
  fakeInherit,
};

/***/ }),

/***/ 903:
/***/ ((module) => {

/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/** `Object#toString` result references. */
var funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    symbolTag = '[object Symbol]';

/** Used to match property names within property paths. */
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
    reIsPlainProp = /^\w*$/,
    reLeadingDot = /^\./,
    rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to match backslashes in property paths. */
var reEscapeChar = /\\(\\)?/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

/**
 * Checks if `value` is a host object in IE < 9.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
 */
function isHostObject(value) {
  // Many host objects are `Object` objects that can coerce to strings
  // despite having improperly defined `toString` methods.
  var result = false;
  if (value != null && typeof value.toString != 'function') {
    try {
      result = !!(value + '');
    } catch (e) {}
  }
  return result;
}

/** Used for built-in method references. */
var arrayProto = Array.prototype,
    funcProto = Function.prototype,
    objectProto = Object.prototype;

/** Used to detect overreaching core-js shims. */
var coreJsData = root['__core-js_shared__'];

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/** Built-in value references. */
var Symbol = root.Symbol,
    splice = arrayProto.splice;

/* Built-in method references that are verified to be native. */
var Map = getNative(root, 'Map'),
    nativeCreate = getNative(Object, 'create');

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolToString = symbolProto ? symbolProto.toString : undefined;

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries ? entries.length : 0;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */
function hashClear() {
  this.__data__ = nativeCreate ? nativeCreate(null) : {};
}

/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  return this.has(key) && delete this.__data__[key];
}

/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED ? undefined : result;
  }
  return hasOwnProperty.call(data, key) ? data[key] : undefined;
}

/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate ? data[key] !== undefined : hasOwnProperty.call(data, key);
}

/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */
function hashSet(key, value) {
  var data = this.__data__;
  data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
  return this;
}

// Add methods to `Hash`.
Hash.prototype.clear = hashClear;
Hash.prototype['delete'] = hashDelete;
Hash.prototype.get = hashGet;
Hash.prototype.has = hashHas;
Hash.prototype.set = hashSet;

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
      length = entries ? entries.length : 0;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
}

/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function listCacheDelete(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  return true;
}

/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function listCacheGet(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  return index < 0 ? undefined : data[index][1];
}

/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function listCacheHas(key) {
  return assocIndexOf(this.__data__, key) > -1;
}

/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */
function listCacheSet(key, value) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}

// Add methods to `ListCache`.
ListCache.prototype.clear = listCacheClear;
ListCache.prototype['delete'] = listCacheDelete;
ListCache.prototype.get = listCacheGet;
ListCache.prototype.has = listCacheHas;
ListCache.prototype.set = listCacheSet;

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
      length = entries ? entries.length : 0;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.__data__ = {
    'hash': new Hash,
    'map': new (Map || ListCache),
    'string': new Hash
  };
}

/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function mapCacheDelete(key) {
  return getMapData(this, key)['delete'](key);
}

/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function mapCacheGet(key) {
  return getMapData(this, key).get(key);
}

/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapCacheHas(key) {
  return getMapData(this, key).has(key);
}

/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */
function mapCacheSet(key, value) {
  getMapData(this, key).set(key, value);
  return this;
}

// Add methods to `MapCache`.
MapCache.prototype.clear = mapCacheClear;
MapCache.prototype['delete'] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;

/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (eq(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}

/**
 * The base implementation of `_.get` without support for default values.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @returns {*} Returns the resolved value.
 */
function baseGet(object, path) {
  path = isKey(path, object) ? [path] : castPath(path);

  var index = 0,
      length = path.length;

  while (object != null && index < length) {
    object = object[toKey(path[index++])];
  }
  return (index && index == length) ? object : undefined;
}

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!isObject(value) || isMasked(value)) {
    return false;
  }
  var pattern = (isFunction(value) || isHostObject(value)) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}

/**
 * The base implementation of `_.toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * Casts `value` to a path array if it's not one.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {Array} Returns the cast property path array.
 */
function castPath(value) {
  return isArray(value) ? value : stringToPath(value);
}

/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */
function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : undefined;
}

/**
 * Checks if `value` is a property name and not a property path.
 *
 * @private
 * @param {*} value The value to check.
 * @param {Object} [object] The object to query keys on.
 * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
 */
function isKey(value, object) {
  if (isArray(value)) {
    return false;
  }
  var type = typeof value;
  if (type == 'number' || type == 'symbol' || type == 'boolean' ||
      value == null || isSymbol(value)) {
    return true;
  }
  return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
    (object != null && value in Object(object));
}

/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
    ? (value !== '__proto__')
    : (value === null);
}

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && (maskSrcKey in func);
}

/**
 * Converts `string` to a property path array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the property path array.
 */
var stringToPath = memoize(function(string) {
  string = toString(string);

  var result = [];
  if (reLeadingDot.test(string)) {
    result.push('');
  }
  string.replace(rePropName, function(match, number, quote, string) {
    result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
  });
  return result;
});

/**
 * Converts `value` to a string key if it's not a string or symbol.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {string|symbol} Returns the key.
 */
function toKey(value) {
  if (typeof value == 'string' || isSymbol(value)) {
    return value;
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to process.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString.call(func);
    } catch (e) {}
    try {
      return (func + '');
    } catch (e) {}
  }
  return '';
}

/**
 * Creates a function that memoizes the result of `func`. If `resolver` is
 * provided, it determines the cache key for storing the result based on the
 * arguments provided to the memoized function. By default, the first argument
 * provided to the memoized function is used as the map cache key. The `func`
 * is invoked with the `this` binding of the memoized function.
 *
 * **Note:** The cache is exposed as the `cache` property on the memoized
 * function. Its creation may be customized by replacing the `_.memoize.Cache`
 * constructor with one whose instances implement the
 * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
 * method interface of `delete`, `get`, `has`, and `set`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to have its output memoized.
 * @param {Function} [resolver] The function to resolve the cache key.
 * @returns {Function} Returns the new memoized function.
 * @example
 *
 * var object = { 'a': 1, 'b': 2 };
 * var other = { 'c': 3, 'd': 4 };
 *
 * var values = _.memoize(_.values);
 * values(object);
 * // => [1, 2]
 *
 * values(other);
 * // => [3, 4]
 *
 * object.a = 2;
 * values(object);
 * // => [1, 2]
 *
 * // Modify the result cache.
 * values.cache.set(object, ['a', 'b']);
 * values(object);
 * // => ['a', 'b']
 *
 * // Replace `_.memoize.Cache`.
 * _.memoize.Cache = WeakMap;
 */
function memoize(func, resolver) {
  if (typeof func != 'function' || (resolver && typeof resolver != 'function')) {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  var memoized = function() {
    var args = arguments,
        key = resolver ? resolver.apply(this, args) : args[0],
        cache = memoized.cache;

    if (cache.has(key)) {
      return cache.get(key);
    }
    var result = func.apply(this, args);
    memoized.cache = cache.set(key, result);
    return result;
  };
  memoized.cache = new (memoize.Cache || MapCache);
  return memoized;
}

// Assign cache to `_.memoize`.
memoize.Cache = MapCache;

/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 8-9 which returns 'object' for typed array and other constructors.
  var tag = isObject(value) ? objectToString.call(value) : '';
  return tag == funcTag || tag == genTag;
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  return value == null ? '' : baseToString(value);
}

/**
 * Gets the value at `path` of `object`. If the resolved value is
 * `undefined`, the `defaultValue` is returned in its place.
 *
 * @static
 * @memberOf _
 * @since 3.7.0
 * @category Object
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @param {*} [defaultValue] The value returned for `undefined` resolved values.
 * @returns {*} Returns the resolved value.
 * @example
 *
 * var object = { 'a': [{ 'b': { 'c': 3 } }] };
 *
 * _.get(object, 'a[0].b.c');
 * // => 3
 *
 * _.get(object, ['a', '0', 'b', 'c']);
 * // => 3
 *
 * _.get(object, 'a.b.c', 'default');
 * // => 'default'
 */
function get(object, path, defaultValue) {
  var result = object == null ? undefined : baseGet(object, path);
  return result === undefined ? defaultValue : result;
}

module.exports = get;


/***/ }),

/***/ 147:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 37:
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ 781:
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const json2csv = (__nccwpck_require__(665)/* .parse */ .Qc);
const fs = __nccwpck_require__(147);

function getAltUrls(timeframe = ['1d'], pageList = [1]){
    let urls = [];
    timeframe.forEach(tf => {
        pageList.forEach(page => {
            //console.log("https://api.altmetric.com/v1/citations/" + tf + "?num_results=100&page=" + page + "&doi_prefix=10.1101");
            urls.push("https://api.altmetric.com/v1/citations/" + tf + "?num_results=100&page=" + page + "&doi_prefix=10.1101");
        }
    )});
    return urls;
}

/* 
Use filteredData as input, use bioRxiv API to retrive detailed info according to altmetric_jid and doi
*/
function getBioRxivData(filteredData) {
    var urls = [];
    filteredData.forEach(item => {
        urls.push("https://api.biorxiv.org/details/" + item.altmetric_jid + "/" + item.doi);

    });
    var result = [];
    var promises = [];
    var delay = 0;
    for (let i = 0; i < urls.length; i++) { //暂时将循环次数urls.length改为2，只取前两条作为测试
        //console.log("Fetching " + urls[i]);
        var promise = new Promise((resolve, reject) => {
            setTimeout(() => {
              fetch(urls[i])
                .then(response => response.json())
                .then(results => {
                  result.push(...results.collection);
                  resolve();
                })
                .catch(error => reject(error))
                .finally(() => {
                    printProgressBar(i/urls.length, "Fetching bioRxiv data"); // 更新进度条
                  });
            }, delay);
            delay += 1000; // 设置1秒的时间间隔
          });
          promises.push(promise);
    }
    return Promise.all(promises).then(() => result);
}


function getAltData() {
    //var urls = getAltUrls(timeframe = ['1d','3d','1w','1m'], pageList = [1, 2]);
    var urls = getAltUrls(timeframe = ['1m'], pageList = [1]);
    var result = [];
    var promises = [];
    var delay = 0;
    for (let i = 0; i < urls.length; i++) {
        var promise = new Promise((resolve, reject) => {
          setTimeout(() => {
            fetch(urls[i])
              .then(response => response.json())
              .then(results => {
                result.push(...results.results);
                resolve();
              })
              .catch(error => reject(error))
          }, delay);
          delay += 500; // 设置1秒的时间间隔
        });
        promises.push(promise);
      }
      return Promise.all(promises).then(() => result);
}

getAltData().then(function(data) {
    //console.log(data.length); // 在所有请求完成后输出结果数组

    // 去重
    const uniqueData = Object.values(data.reduce((accumulator, current) => {
        accumulator[current.doi] = accumulator[current.doi] || current;
        return accumulator;
      }, {}));
    //console.log(uniqueData.length);

    // Use history.1d, 3d, 1w, 1m of uniqueData  to X1d, X3d, X1w, X1m
    // Only reserve title, doi, altmetric_jid, score and X1d, X3d, X1w, X1m
    const renamedData = uniqueData.map((item) => {
        const { history, ...rest } = item;
        return {
            ...rest,
            X1d: history['1d'],
            X3d: history['3d'],
            X1w: history['1w'],
            X1m: history['1m'],
        }
    } ).map(({ title, doi, altmetric_jid, score, X1d, X3d, X1w, X1m }) => ({ title, doi, altmetric_jid, score, X1d, X3d, X1w, X1m }));
    
    //console.log(renamedData[0]);

    // replace altmetric_jid = 532721422a83ee84788b4567 with biorxiv, then only keep altmetric_jid = biorxiv or medrxiv
    const filteredData = renamedData.filter((item) => {
        if (item.altmetric_jid == '532721422a83ee84788b4567') {
            item.altmetric_jid = 'biorxiv';
        }
        return item.altmetric_jid == 'biorxiv' || item.altmetric_jid == 'medrxiv';
    });

    //console.log(renamedData.length);
    //console.log(filteredData.length);
    //console.log(filteredData[0]);

    // Use filteredData as input, use bioRxiv API to retrive detailed info according to altmetric_jid and doi
    getBioRxivData(filteredData).then(data => {
        //其中每个doi只保留version值最大的那个结果
        const map = new Map();
        data.forEach(item => {
            if(!map.has(item.doi) || map.get(item.doi).version < item.version){
              map.set(item.doi, item);
            }
        });
        const biorxivDedup = Array.from(map.values());

        //merge filteredData and biorxivDedup by doi
        const mergedData = filteredData.reduce((acc, obj1) => {
            const obj2 = biorxivDedup.find((obj2) => obj2.doi === obj1.doi);
            if (obj2) {
                acc.push(Object.assign({}, obj1, obj2, {upupdate_time : Date.now()} ));
            }
            return acc;
        }, []);

        // 计算三个月前的日期
        var threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        // filter mergedData by date, in three months
        const filteredMergedData = mergedData.filter((item) => {
            var date = new Date(item.date); // 假设JSON数据中的日期保存在date字段中
            return date >= threeMonthsAgo;
        });

        // output mergedData in csv format
        const csvData = json2csv(filteredMergedData);
        fs.writeFile('data.csv', csvData, (err) => {
            if (err) {
              console.error(err);
            } else {
              console.log('CSV file has been written');
            }
          });
        //console.log(mergedData[0]);
    })

});


// 搞个进度条出来
function printProgressBar(percent, name) {
    const maxBarLength = 50; // 进度条的最大长度
    const barLength = Math.round(percent * maxBarLength); // 计算进度条的长度
  
    const bar = '■'.repeat(barLength).padEnd(maxBarLength, '□'); // 构造带进度的进度条
    const percentage = Math.round(percent * 100); // 计算百分比
  
    console.clear(); // 清空控制台
    console.log(name +' : ' + `[${bar}] ${percentage}%`); // 输出进度条
  }
})();

module.exports = __webpack_exports__;
/******/ })()
;