import {
  registry,
  loginFailedTotal,
  tokenReuseTotal,
  unhandledErrorsTotal,
  httpRequestsTotal,
} from './metrics';
import { JsonLogger } from './json-logger';
import { captureError, isSentryEnabled } from './sentry';

describe('observability metrics (MR-03)', () => {
  it('registry exposes ROS metric names', async () => {
    const text = await registry.metrics();
    expect(text).toContain('ros_http_requests_total');
    expect(text).toContain('ros_login_failed_total');
    expect(text).toContain('ros_token_reuse_total');
    expect(text).toContain('ros_unhandled_errors_total');
    // default node metrics ก็ต้องมี (prefix ros_)
    expect(text).toContain('ros_process_cpu_user_seconds_total');
  });

  it('security counters increment', async () => {
    const before = (await loginFailedTotal.get()).values[0]?.value ?? 0;
    loginFailedTotal.inc();
    const after = (await loginFailedTotal.get()).values[0]?.value ?? 0;
    expect(after).toBe(before + 1);

    const r0 = (await tokenReuseTotal.get()).values[0]?.value ?? 0;
    tokenReuseTotal.inc();
    expect((await tokenReuseTotal.get()).values[0]?.value).toBe(r0 + 1);
  });

  it('labeled counters work (http + unhandled errors)', async () => {
    httpRequestsTotal.labels('GET', '/api/v1/health', '200').inc();
    unhandledErrorsTotal.labels('INTERNAL_ERROR').inc();
    const text = await registry.metrics();
    expect(text).toContain('route="/api/v1/health"');
    expect(text).toContain('code="INTERNAL_ERROR"');
  });
});

describe('JsonLogger (MR-03)', () => {
  it('emits one parseable JSON line per log', () => {
    const lines: string[] = [];
    const spy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((chunk: unknown) => {
        lines.push(String(chunk));
        return true;
      });

    new JsonLogger().log('hello', 'TestCtx');
    spy.mockRestore();

    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('hello');
    expect(parsed.context).toBe('TestCtx');
    expect(typeof parsed.time).toBe('string');
  });

  it('errors go to stderr', () => {
    const errLines: string[] = [];
    const spy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation((chunk: unknown) => {
        errLines.push(String(chunk));
        return true;
      });
    new JsonLogger().error('boom', 'stack-trace', 'Ctx');
    spy.mockRestore();

    const parsed = JSON.parse(errLines[0]);
    expect(parsed.level).toBe('error');
    expect(parsed.stack).toBe('stack-trace');
  });
});

describe('sentry (MR-03)', () => {
  it('is disabled without SENTRY_DSN and captureError is a no-op', () => {
    expect(isSentryEnabled()).toBe(false);
    expect(() => captureError(new Error('x'), { request_id: 'req_1' })).not.toThrow();
  });
});
