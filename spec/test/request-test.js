"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zlib_1 = __importDefault(require("zlib"));
const assert_1 = __importDefault(require("assert"));
const dist_1 = __importDefault(require("../dist"));
const nock_1 = __importDefault(require("nock"));
const sinon_1 = __importDefault(require("sinon"));
const stream_equal_1 = __importDefault(require("stream-equal"));
require("longjohn");
nock_1.default.disableNetConnect();
describe('Make a request', () => {
    afterEach(() => nock_1.default.cleanAll());
    let clock;
    beforeEach(() => clock = sinon_1.default.useFakeTimers());
    afterEach(() => clock.uninstall());
    const stub = sinon_1.default.stub(console, 'warn');
    after(() => stub.restore());
    describe('with `.text()`', () => {
        it('Gives entire contents of page', () => __awaiter(void 0, void 0, void 0, function* () {
            const scope = (0, nock_1.default)('http://webby.com')
                .get('/pathos')
                .replyWithFile(200, __filename);
            let body = yield (0, dist_1.default)('http://webby.com/pathos').text();
            scope.done();
            assert_1.default.ok(body.length > 100);
        }));
        describe('that errors', () => {
            it('error is caught', () => __awaiter(void 0, void 0, void 0, function* () {
                const scope = (0, nock_1.default)('http://something.com')
                    .get('/one/two/three')
                    .replyWithError('NONONO');
                yield assert_1.default.rejects((0, dist_1.default)('http://something.com/one/two/three', { maxRetries: 0 }).text(), { message: 'NONONO' });
                scope.done();
            }));
        });
    });
    describe('to a working site', () => {
        it('Returns a stream', done => {
            const scope = (0, nock_1.default)('http://website.com')
                .get('/path')
                .replyWithFile(200, __filename);
            const stream = (0, dist_1.default)('http://website.com/path');
            stream.on('error', done);
            stream.on('end', () => {
                scope.done();
                done();
            });
            stream.resume();
        });
    });
    describe('with options', () => {
        it('Makes request with options', () => __awaiter(void 0, void 0, void 0, function* () {
            const scope = (0, nock_1.default)('http://website.com', {
                reqheaders: { 'User-Agent': 'miniget' },
            })
                .get('/path')
                .replyWithFile(200, __filename);
            let body = yield (0, dist_1.default)('http://website.com/path', {
                headers: { 'User-Agent': 'miniget' },
            }).text();
            scope.done();
            assert_1.default.ok(body.length > 100);
        }));
    });
    describe('with bad path', () => {
        it('Emits error', done => {
            const scope = (0, nock_1.default)('https://mysite.com')
                .get('/badpath')
                .reply(404, 'not exists');
            let stream = (0, dist_1.default)('https://mysite.com/badpath');
            stream.on('error', err => {
                scope.done();
                assert_1.default.ok(err);
                done();
            });
        });
    });
    describe('that errors', () => {
        it('Emits error event', done => {
            const scope = (0, nock_1.default)('https://mysite.com')
                .get('/path')
                .replyWithError('ENOTFOUND')
                .get('/path')
                .replyWithError('ENOTFOUND')
                .get('/path')
                .reply(500, 'oh no 3');
            const stream = (0, dist_1.default)('https://mysite.com/path');
            stream.on('retry', retryCount => {
                process.nextTick(() => {
                    clock.tick(retryCount * 100);
                });
            });
            stream.on('error', err => {
                scope.done();
                assert_1.default.equal(err.message, 'Status code: 500');
                assert_1.default.equal(err.statusCode, 500);
                done();
            });
        });
        describe('without retries', () => {
            it('Emits error event', done => {
                const scope = (0, nock_1.default)('https://mysite.com')
                    .get('/path')
                    .replyWithError('oh no 1');
                const stream = (0, dist_1.default)('https://mysite.com/path', { maxRetries: 0 });
                stream.on('error', err => {
                    assert_1.default.equal(err.message, 'oh no 1');
                    scope.done();
                    done();
                });
            });
        });
    });
    describe('using https protocol', () => {
        it('Uses the https module', done => {
            const scope = (0, nock_1.default)('https://secureplace.net')
                .get('/')
                .reply(200);
            const stream = (0, dist_1.default)('https://secureplace.net');
            stream.on('error', done);
            stream.on('end', () => {
                scope.done();
                done();
            });
            stream.resume();
        });
    });
    describe('with auth', () => {
        it('Passes auth to request', () => __awaiter(void 0, void 0, void 0, function* () {
            const scope = (0, nock_1.default)('https://lockbox.com')
                .get('/vault')
                .basicAuth({ user: 'john', pass: 'pass' })
                .reply(200);
            yield (0, dist_1.default)('https://john:pass@lockbox.com/vault');
            scope.done();
        }));
    });
    describe('with URL object passed', () => {
        it('Creates request and gets correct response', () => __awaiter(void 0, void 0, void 0, function* () {
            const scope = (0, nock_1.default)('http://webby.com')
                .get('/pathos')
                .replyWithFile(200, __filename);
            let body = yield (0, dist_1.default)(new URL('http://webby.com/pathos')).text();
            scope.done();
            assert_1.default.ok(body.length > 100);
        }));
    });
    describe('with an incorrect URL', () => {
        it('Emits error', done => {
            (0, dist_1.default)('file:///path/to/file/').on('error', err => {
                assert_1.default.ok(err);
                assert_1.default.equal(err.message, 'Invalid URL: file:///path/to/file/');
                done();
            });
        });
    });
    describe('with no URL', () => {
        it('Emits error', done => {
            (0, dist_1.default)('undefined').on('error', err => {
                assert_1.default.ok(err);
                assert_1.default.equal(err.message, 'Invalid URL: undefined');
                done();
            });
        });
    });
    describe('that redirects', () => {
        it('Should download file after redirect', done => {
            const scope = (0, nock_1.default)('http://mysite.com')
                .get('/pathy')
                .reply(302, '', { Location: 'http://mysite.com/redirected!' })
                .get('/redirected!')
                .reply(200, 'Helloo!');
            const stream = (0, dist_1.default)('http://mysite.com/pathy');
            stream.on('error', done);
            stream.on('data', body => {
                scope.done();
                assert_1.default.equal(body, 'Helloo!');
                done();
            });
            stream.on('redirect', () => {
                clock.tick(1);
            });
        });
        describe('too many times', () => {
            it('Emits error after 3 retries', done => {
                const scope = (0, nock_1.default)('http://yoursite.com')
                    .get('/first-request')
                    .reply(302, '', { Location: 'http://yoursite.com/redirect-1' })
                    .get('/redirect-1')
                    .reply(302, '', { Location: 'http://yoursite.com/redirect-2' })
                    .get('/redirect-2')
                    .reply(302, '', { Location: 'http://yoursite.com/redirect-3' });
                const stream = (0, dist_1.default)('http://yoursite.com/first-request', {
                    maxRedirects: 2,
                });
                stream.on('error', err => {
                    assert_1.default.ok(err);
                    scope.done();
                    assert_1.default.equal(err.message, 'Too many redirects');
                    done();
                });
                stream.on('redirect', () => {
                    clock.tick(1);
                });
            });
        });
        describe('with `retry-after` header', () => {
            it('Redirects after given time', done => {
                const scope = (0, nock_1.default)('http://mysite2.com')
                    .get('/pathos/to/resource')
                    .reply(301, '', {
                    Location: 'http://mysite2.com/newpath/to/source',
                    'Retry-After': '300',
                })
                    .get('/newpath/to/source')
                    .reply(200, 'hi world!!');
                const stream = (0, dist_1.default)('http://mysite2.com/pathos/to/resource');
                stream.on('error', done);
                stream.on('data', body => {
                    scope.done();
                    assert_1.default.equal(body, 'hi world!!');
                    done();
                });
                stream.on('redirect', () => {
                    clock.tick(300 * 1000);
                });
            });
        });
        describe('without `location` header', () => {
            it('Throws an error', done => {
                const scope = (0, nock_1.default)('http://mysite.com')
                    .get('/pathy')
                    .reply(302, '', {});
                const stream = (0, dist_1.default)('http://mysite.com/pathy');
                stream.on('error', err => {
                    scope.done();
                    assert_1.default.equal(err.message, 'Redirect status code given with no location');
                    done();
                });
            });
        });
    });
    describe('that gets rate limited', () => {
        it('Retries the request after some time', done => {
            const scope = (0, nock_1.default)('https://mysite.io')
                .get('/api/v1/data')
                .reply(429, 'slow down')
                .get('/api/v1/data')
                .reply(200, 'where are u');
            const stream = (0, dist_1.default)('https://mysite.io/api/v1/data');
            stream.on('error', done);
            stream.on('data', data => {
                scope.done();
                assert_1.default.equal(data, 'where are u');
                done();
            });
            stream.on('retry', () => {
                clock.tick(1000);
            });
        });
        it('Emits error after multiple tries', done => {
            const scope = (0, nock_1.default)('https://mysite.io')
                .get('/api/v1/data')
                .reply(429, 'too many requests')
                .get('/api/v1/data')
                .reply(429, 'too many requests')
                .get('/api/v1/data')
                .reply(429, 'too many requests');
            const stream = (0, dist_1.default)('https://mysite.io/api/v1/data');
            stream.on('error', err => {
                assert_1.default.ok(err);
                scope.done();
                assert_1.default.equal(err.message, 'Status code: 429');
                assert_1.default.equal(err.statusCode, 429);
                done();
            });
            stream.on('retry', () => {
                clock.tick(1000);
            });
        });
        describe('with `retry-after` header', () => {
            it('Retries after given time', done => {
                const scope = (0, nock_1.default)('https://mysite.io')
                    .get('/api/v1/dota')
                    .reply(429, 'slow down', { 'Retry-After': '3600' })
                    .get('/api/v1/dota')
                    .reply(200, 'where are u');
                const stream = (0, dist_1.default)('https://mysite.io/api/v1/dota');
                stream.on('error', done);
                stream.on('data', data => {
                    scope.done();
                    assert_1.default.equal(data, 'where are u');
                    done();
                });
                stream.on('retry', () => {
                    // Test that ticking by a bit does not retry the request.
                    clock.tick(1000);
                    assert_1.default.ok(!scope.isDone());
                    clock.tick(3600 * 1000);
                });
            });
        });
    });
    describe('using the `transform` option', () => {
        it('Calls `transform` function and customizes request', () => __awaiter(void 0, void 0, void 0, function* () {
            const scope = (0, nock_1.default)('http://other.com')
                .get('/http://supplies.com/boxes')
                .reply(200, '[  ]');
            let transformCalled = false;
            let body = yield (0, dist_1.default)('http://supplies.com/boxes', {
                transform: parsed => {
                    transformCalled = true;
                    return {
                        host: 'other.com',
                        path: `/${parsed.protocol}//${parsed.host}${parsed.path}`,
                    };
                },
            }).text();
            assert_1.default.ok(transformCalled);
            scope.done();
            assert_1.default.equal(body, '[  ]');
        }));
        it('Calls `transform` function and customizes request with protocol changing', () => __awaiter(void 0, void 0, void 0, function* () {
            const scope = (0, nock_1.default)('http://that.com')
                .get('/')
                .reply(200, '[  ]');
            let body = yield (0, dist_1.default)('https://that.com', {
                transform: parsed => {
                    parsed.protocol = 'http:';
                    return parsed;
                },
            }).text();
            scope.done();
            assert_1.default.equal(body, '[  ]');
        }));
        describe('with bad URL', () => {
            it('Catches error', done => {
                let stream = (0, dist_1.default)('http://supplies.com/boxes', {
                    transform: parsed => {
                        parsed.protocol = 'file';
                        return parsed;
                    },
                });
                stream.on('error', err => {
                    assert_1.default.equal(err.message, 'Invalid URL object from `transform` function');
                    done();
                });
            });
        });
        describe('with no object returned', () => {
            it('Catches error', done => {
                let stream = (0, dist_1.default)('http://supplies.com/boxes', {
                    transform: (_) => undefined,
                });
                stream.on('error', err => {
                    assert_1.default.equal(err.message, 'Invalid URL object from `transform` function');
                    done();
                });
            });
        });
        describe('that throws', () => {
            it('Catches error', done => {
                let stream = (0, dist_1.default)('http://kanto.com', {
                    transform: () => { throw Error('hello'); },
                });
                stream.on('error', err => {
                    assert_1.default.equal(err.message, 'hello');
                    done();
                });
            });
        });
    });
    describe('that disconnects before end', () => {
        const file = path_1.default.resolve(__dirname, 'video.flv');
        let filesize;
        before(done => {
            fs_1.default.stat(file, (err, stat) => {
                assert_1.default.ifError(err);
                filesize = stat.size;
                done();
            });
        });
        const destroy = (req, res) => {
            req.destroy();
            res.unpipe();
        };
        it('Still downloads entire file', done => {
            const scope = (0, nock_1.default)('http://mysite.com')
                .get('/myfile')
                .replyWithFile(200, file, {
                'content-length': `${filesize}`,
                'accept-ranges': 'bytes',
            });
            const stream = (0, dist_1.default)('http://mysite.com/myfile', { maxReconnects: 1 });
            let req, res;
            stream.on('request', a => { req = a; });
            stream.on('response', a => { res = a; });
            let reconnects = 0;
            stream.on('reconnect', () => {
                reconnects++;
                clock.tick(100);
            });
            let downloaded = 0, destroyed = false;
            stream.on('data', chunk => {
                downloaded += chunk.length;
                if (!destroyed && downloaded / filesize >= 0.3) {
                    destroyed = true;
                    scope.get('/myfile')
                        .reply(206, () => fs_1.default.createReadStream(file, { start: downloaded }), {
                        'content-range': `bytes ${downloaded}-${filesize}/${filesize}`,
                        'content-length': `${filesize - downloaded}`,
                        'accept-ranges': 'bytes',
                    });
                    destroy(req, res);
                }
            });
            stream.on('error', done);
            stream.on('end', () => {
                scope.done();
                assert_1.default.ok(destroyed);
                assert_1.default.equal(reconnects, 1);
                assert_1.default.equal(downloaded, filesize);
                done();
            });
        });
        describe('without an error', () => {
            it('Still downloads entire file', done => {
                const scope = (0, nock_1.default)('http://mysite.com')
                    .get('/myfile')
                    .replyWithFile(200, file, {
                    'content-length': `${filesize}`,
                    'accept-ranges': 'bytes',
                });
                const stream = (0, dist_1.default)('http://mysite.com/myfile', { maxReconnects: 1 });
                let res;
                stream.on('response', a => { res = a; });
                let reconnects = 0;
                stream.on('reconnect', () => {
                    reconnects++;
                    clock.tick(100);
                });
                let downloaded = 0, destroyed = false;
                stream.on('data', chunk => {
                    downloaded += chunk.length;
                    if (!destroyed && downloaded / filesize >= 0.3) {
                        destroyed = true;
                        scope.get('/myfile')
                            .reply(206, () => fs_1.default.createReadStream(file, { start: downloaded }), {
                            'content-range': `bytes ${downloaded}-${filesize}/${filesize}`,
                            'content-length': `${filesize - downloaded}`,
                            'accept-ranges': 'bytes',
                        });
                        res.emit('end');
                    }
                });
                stream.on('error', done);
                stream.on('end', () => {
                    scope.done();
                    assert_1.default.ok(destroyed);
                    assert_1.default.equal(reconnects, 1);
                    assert_1.default.equal(downloaded, filesize);
                    done();
                });
            });
            describe('without enough reconnects', () => {
                it('Downloads partial file', done => {
                    const scope = (0, nock_1.default)('http://mysite.com')
                        .get('/yourfile')
                        .replyWithFile(200, file, {
                        'content-length': `${filesize}`,
                        'accept-ranges': 'bytes',
                    });
                    const stream = (0, dist_1.default)('http://mysite.com/yourfile', {
                        maxReconnects: 1,
                        maxRetries: 0,
                    });
                    let res;
                    stream.on('response', a => {
                        res = a;
                    });
                    let reconnects = 0;
                    stream.on('reconnect', () => {
                        reconnects++;
                        scope.get('/yourfile')
                            .reply(206, fs_1.default.createReadStream(file, { start: downloaded }), {
                            'content-range': `bytes ${downloaded}-${filesize}/${filesize}`,
                            'content-length': `${filesize - downloaded}`,
                            'accept-ranges': 'bytes',
                        });
                        clock.tick(100);
                    });
                    let downloaded = 0, destroyed = false;
                    stream.on('data', chunk => {
                        downloaded += chunk.length;
                        if (downloaded / filesize >= 0.3) {
                            destroyed = true;
                            res.emit('end');
                        }
                    });
                    stream.on('error', done);
                    stream.on('end', () => {
                        scope.done();
                        assert_1.default.ok(destroyed);
                        assert_1.default.equal(reconnects, 1);
                        assert_1.default.notEqual(downloaded, filesize);
                        done();
                    });
                });
            });
        });
        describe('too many times', () => {
            it('Emits error', done => {
                const scope = (0, nock_1.default)('http://mysite.com')
                    .get('/myfile')
                    .replyWithFile(200, file, {
                    'content-length': `${filesize}`,
                    'accept-ranges': 'bytes',
                });
                const stream = (0, dist_1.default)('http://mysite.com/myfile', {
                    maxReconnects: 2,
                    headers: { Range: 'bad' },
                });
                let req, res;
                stream.on('request', a => { req = a; });
                stream.on('response', a => { res = a; });
                let reconnects = 0;
                stream.on('reconnect', () => {
                    reconnects++;
                    clock.tick(100);
                });
                let downloaded = 0, destroyed = false;
                stream.on('data', chunk => {
                    downloaded += chunk.length;
                    if (downloaded / filesize >= 0.3) {
                        destroyed = true;
                        destroy(req, res);
                        if (reconnects < 2) {
                            scope.get('/myfile')
                                .reply(206, () => fs_1.default.createReadStream(file, { start: downloaded }), {
                                'content-range': `bytes ${downloaded}-${filesize}/${filesize}`,
                                'content-length': `${filesize - downloaded}`,
                                'accept-ranges': 'bytes',
                            });
                        }
                        else {
                            scope.done();
                            assert_1.default.equal(reconnects, 2);
                            assert_1.default.ok(destroyed);
                            assert_1.default.notEqual(downloaded, filesize);
                            done();
                        }
                    }
                });
                stream.on('end', () => {
                    // Does fire in node v12
                    // done(Error('should not end'));
                });
            });
        });
        describe('with ranged request headers', () => {
            it('Downloads correct portion of file', done => {
                const start = Math.round(filesize / 3);
                const scope = (0, nock_1.default)('http://mysite.com', { reqheaders: { Range: /bytes=/ } })
                    .get('/myfile')
                    .reply(206, () => fs_1.default.createReadStream(file, { start }), {
                    'content-length': `${filesize - start}`,
                    'content-range': `bytes ${start}-${filesize}/${filesize}`,
                    'accept-ranges': 'bytes',
                });
                const stream = (0, dist_1.default)('http://mysite.com/myfile', {
                    maxReconnects: 1,
                    headers: { Range: `bytes=${start}-` },
                });
                let req, res;
                stream.on('request', a => { req = a; });
                stream.on('response', a => { res = a; });
                let reconnects = 0;
                stream.on('reconnect', () => {
                    reconnects++;
                    clock.tick(100);
                });
                let downloaded = start, destroyed = false;
                stream.on('data', chunk => {
                    downloaded += chunk.length;
                    if (!destroyed && downloaded / filesize >= 0.5) {
                        destroyed = true;
                        scope.get('/myfile')
                            .reply(206, () => fs_1.default.createReadStream(file, { start: downloaded }), {
                            'content-range': `bytes ${downloaded}-${filesize}/${filesize}`,
                            'content-length': `${filesize - downloaded}`,
                            'accept-ranges': 'bytes',
                        });
                        destroy(req, res);
                    }
                });
                stream.on('error', done);
                stream.on('end', () => {
                    scope.done();
                    assert_1.default.ok(destroyed);
                    assert_1.default.equal(reconnects, 1);
                    assert_1.default.equal(downloaded, filesize);
                    done();
                });
            });
        });
    });
    describe('that gets destroyed', () => {
        describe('immediately', () => {
            it('Does not end stream', done => {
                (0, nock_1.default)('http://anime.me')
                    .get('/')
                    .reply(200, 'ooooaaaaaaaeeeee');
                const stream = (0, dist_1.default)('http://anime.me');
                stream.on('end', () => {
                    done(Error('`end` event should not be called'));
                });
                stream.on('error', () => {
                    // Ignore error on node v10, 12.
                });
                stream.destroy();
                done();
            });
        });
        describe('after getting `request`', () => {
            it('Does not start download, no `response` event', done => {
                (0, nock_1.default)('https://friend.com')
                    .get('/yes')
                    .reply(200, '<html>my reply :)</html>');
                const stream = (0, dist_1.default)('https://friend.com/yes');
                stream.on('end', () => {
                    done(Error('`end` event should not emit'));
                });
                stream.on('response', () => {
                    done(Error('`response` event should not emit'));
                });
                stream.on('data', () => {
                    done(Error('Should not read any data'));
                });
                stream.on('error', () => {
                    // Ignore error on node v10, 12.
                });
                stream.on('request', () => {
                    stream.destroy();
                    done();
                });
            });
        });
        describe('after getting `response` but before end', () => {
            it('Response does not give any data', done => {
                const file = path_1.default.resolve(__dirname, 'video.flv');
                const scope = (0, nock_1.default)('http://www.google1.com')
                    .get('/one')
                    .delayBody(100)
                    .replyWithFile(200, file);
                const stream = (0, dist_1.default)('http://www.google1.com/one');
                stream.on('end', () => {
                    done(Error('`end` event should not emit'));
                });
                stream.on('data', () => {
                    done(Error('Should not read any data'));
                });
                const errorSpy = sinon_1.default.spy();
                stream.on('error', errorSpy);
                stream.on('response', () => {
                    stream.destroy();
                    scope.done();
                    assert_1.default.ok(!errorSpy.called);
                    done();
                });
            });
        });
        describe('using `abort()`', () => {
            it('Emits `abort` and does not end stream', done => {
                (0, nock_1.default)('http://anime.me')
                    .get('/')
                    .reply(200, 'ooooaaaaaaaeeeee');
                const stream = (0, dist_1.default)('http://anime.me');
                stream.on('end', () => {
                    done(Error('`end` event should not be called'));
                });
                stream.on('error', () => {
                    // Ignore error on node v10, 12.
                });
                stream.on('abort', done);
                stream.abort();
            });
        });
    });
    describe('with `acceptEncoding` option', () => {
        const file = path_1.default.resolve(__dirname, 'video.flv');
        let filesize;
        before(done => {
            fs_1.default.stat(file, (err, stat) => {
                assert_1.default.ifError(err);
                filesize = stat.size;
                done();
            });
        });
        it('Decompresses stream', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = fs_1.default.createReadStream(file).pipe(zlib_1.default.createGzip());
            const scope = (0, nock_1.default)('http://yoursite.com', {
                reqheaders: { 'Accept-Encoding': 'gzip' },
            })
                .get('/compressedfile')
                .reply(200, res, {
                'content-length': `${filesize}`,
                'content-encoding': 'gzip',
            });
            const stream = (0, dist_1.default)('http://yoursite.com/compressedfile', {
                acceptEncoding: { gzip: () => zlib_1.default.createGunzip() },
                maxRetries: 0,
            });
            let equal = yield (0, stream_equal_1.default)(fs_1.default.createReadStream(file), stream);
            assert_1.default.ok(equal);
            scope.done();
        }));
        describe('compressed twice', () => {
            it('Decompresses stream', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = fs_1.default.createReadStream(file)
                    .pipe(zlib_1.default.createGzip())
                    .pipe(zlib_1.default.createDeflate());
                const scope = (0, nock_1.default)('http://yoursite.com', {
                    reqheaders: {},
                })
                    .get('/compressedfile')
                    .reply(200, res, {
                    'content-length': `${filesize}`,
                    'content-encoding': 'gzip, deflate',
                });
                const stream = (0, dist_1.default)('http://yoursite.com/compressedfile', {
                    acceptEncoding: {
                        gzip: () => zlib_1.default.createGunzip(),
                        deflate: () => zlib_1.default.createInflate(),
                    },
                    maxRetries: 0,
                });
                let equal = yield (0, stream_equal_1.default)(fs_1.default.createReadStream(file), stream);
                assert_1.default.ok(equal);
                scope.done();
            }));
        });
        describe('compressed incorrectly', () => {
            it('Emits compression error', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = fs_1.default.createReadStream(file)
                    .pipe(zlib_1.default.createGzip())
                    .pipe(zlib_1.default.createDeflate());
                const scope = (0, nock_1.default)('http://yoursite.com', {
                    reqheaders: { 'Accept-Encoding': 'gzip, deflate' },
                })
                    .get('/compressedfile')
                    .reply(200, res, {
                    'content-length': `${filesize}`,
                    // Encoding is in reverse order.
                    'content-encoding': 'deflate, gzip',
                });
                const stream = (0, dist_1.default)('http://yoursite.com/compressedfile', {
                    maxRetries: 0,
                    acceptEncoding: {
                        gzip: () => zlib_1.default.createGunzip(),
                        deflate: () => zlib_1.default.createInflate(),
                    },
                });
                yield assert_1.default.rejects((0, stream_equal_1.default)(fs_1.default.createReadStream(file), stream), { message: 'incorrect header check' });
                scope.done();
            }));
        });
        describe('without matching decompressing stream', () => {
            it('Gets original compressed stream', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = fs_1.default.createReadStream(file).pipe(zlib_1.default.createGzip());
                const scope = (0, nock_1.default)('http://yoursite.com', {
                    reqheaders: { 'Accept-Encoding': 'deflate' },
                })
                    .get('/compressedfile')
                    .reply(200, res, {
                    'content-length': `${filesize}`,
                    'content-encoding': 'gzip',
                });
                const stream = (0, dist_1.default)('http://yoursite.com/compressedfile', {
                    acceptEncoding: {
                        deflate: () => zlib_1.default.createInflate(),
                    },
                    maxRetries: 0,
                });
                const expected = fs_1.default.createReadStream(file).pipe(zlib_1.default.createGzip());
                let equal = yield (0, stream_equal_1.default)(expected, stream);
                assert_1.default.ok(equal);
                scope.done();
            }));
        });
        describe('destroy mid-stream', () => {
            it('Stops stream without error', done => {
                const res = fs_1.default.createReadStream(file)
                    .pipe(zlib_1.default.createGzip())
                    .pipe(zlib_1.default.createDeflate());
                const scope = (0, nock_1.default)('http://yoursite.com', {
                    reqheaders: { 'Accept-Encoding': 'gzip, deflate' },
                })
                    .get('/compressedfile')
                    .reply(200, res, {
                    'content-length': `${filesize}`,
                    'content-encoding': 'gzip, deflate',
                });
                const stream = (0, dist_1.default)('http://yoursite.com/compressedfile', {
                    acceptEncoding: {
                        gzip: () => zlib_1.default.createGunzip(),
                        deflate: () => zlib_1.default.createInflate(),
                    },
                    maxRetries: 0,
                });
                stream.on('error', done);
                stream.resume();
                let downloaded = 0;
                stream.on('data', chunk => {
                    downloaded += chunk.length;
                    if (downloaded / filesize > 0.5) {
                        stream.destroy();
                        scope.done();
                        done();
                    }
                });
            });
        });
    });
    describe('`response` emits error after end', () => {
        it('Error does not get emitted to stream', done => {
            const scope = (0, nock_1.default)('https://hello.com')
                .get('/one/two')
                .reply(200, '<html></html>');
            const stream = (0, dist_1.default)('https://hello.com/one/two');
            stream.resume();
            let res;
            stream.on('response', a => res = a);
            stream.on('error', done);
            stream.on('end', () => {
                process.nextTick(() => {
                    res.emit('error', Error('random after end error'));
                });
                scope.done();
                done();
            });
        });
    });
    describe('with `method = "HEAD"`', () => {
        it('Emits `response`', done => {
            const scope = (0, nock_1.default)('http://hello.net')
                .head('/world')
                .reply(200, '', { 'content-length': '10' });
            const stream = (0, dist_1.default)('http://hello.net/world', { method: 'HEAD' });
            stream.on('error', done);
            stream.on('response', res => {
                scope.done();
                assert_1.default.equal(res.headers['content-length'], '10');
                done();
            });
        });
    });
    it('Events from request and response are forwarded to miniget stream', done => {
        const scope = (0, nock_1.default)('https://randomhost.com')
            .get('/randompath')
            .reply(200, 'hi');
        const stream = (0, dist_1.default)('https://randomhost.com/randompath');
        const socketSpy = sinon_1.default.spy();
        stream.on('socket', socketSpy);
        stream.on('end', () => {
            scope.done();
            assert_1.default.equal(socketSpy.callCount, 1);
            done();
        });
        stream.resume();
    });
});
describe('Import the module', () => {
    it('Exposes default options', () => {
        assert_1.default.ok(dist_1.default.defaultOptions);
    });
    it('Exposes MinigetError', () => {
        assert_1.default.ok(dist_1.default.MinigetError);
    });
});
