"""Model code that really runs for every video.

Each topic has:
  * a short ``<topic>_demo`` function — its exact source is what appears on screen in code-reel,
    so keep it <= 16 lines and <= 48 characters wide;
  * ``compute_<topic>`` — runs the demo, returns (values, formats, series);
  * ``plot2d_<topic>(ax, series, upto)`` — the 2D chart (upto in 0..1 reveals the series);
  * ``surface_<topic>(series, values)`` — data for the 3D scene.

Every number spoken or shown in a video must come from ``values`` (qa/check_numbers.py enforces it).
Data is simulated with a fixed seed unless a real price CSV is passed; the renderer labels it either way.
"""
from __future__ import annotations

import inspect
import math

import numpy as np

from core import THEME, hex_

ACC, POS, NEG, NEU, MUT, TXT = (hex_(THEME[k]) for k in ("accent", "positive", "negative", "neutral", "muted", "text"))


# =============================================================== GARCH(1,1)
def garch_demo(seed=7, n=500):
    rng = np.random.default_rng(seed)
    w, a, b = 2e-6, 0.09, 0.89   # ω, α, β
    r = np.zeros(n)
    s2 = np.full(n, w / (1 - a - b))
    for t in range(1, n):
        s2[t] = w + a*r[t-1]**2 + b*s2[t-1]
        r[t] = np.sqrt(s2[t]) * rng.normal()
    vol = np.sqrt(s2 * 252)      # năm hoá
    return r, vol, a, b, w


def compute_garch(seed=7, returns=None):
    r, vol, a, b, w = garch_demo(seed)
    if returns is not None:  # real data: filter its variance with the same parameters
        r = np.asarray(returns, float)
        s2 = np.full(len(r), r.var())
        for t in range(1, len(r)):
            s2[t] = w + a * r[t - 1] ** 2 + b * s2[t - 1]
        vol = np.sqrt(s2 * 252)
    pers = a + b
    values = {
        "alpha": a, "beta": b, "persistence": pers,
        "long_run_vol": math.sqrt(w / (1 - pers) * 252),
        "vol_peak": float(vol.max()), "vol_min": float(vol.min()), "vol_last": float(vol[-1]),
        "half_life": math.log(0.5) / math.log(pers),
        "n_days": len(r),
        "big_moves": int((np.abs(r) > 2 * r.std()).sum()),
    }
    formats = {"alpha": "num2", "beta": "num2", "persistence": "num2", "long_run_vol": "pct1",
               "vol_peak": "pct1", "vol_min": "pct1", "vol_last": "pct1", "half_life": "num0",
               "n_days": "int", "big_moves": "int"}
    return values, formats, {"r": r, "vol": vol}


def plot2d_garch(ax, s, upto=1.0):
    n = len(s["r"]); k = max(2, int(n * upto))
    x = np.arange(n); r = s["r"] * 100; v = s["vol"] * 100
    lim = np.abs(r).max() * 1.05
    ax.bar(x[:k], r[:k], width=1.0, color=[POS if q >= 0 else NEG for q in r[:k]], alpha=0.8)
    ax.set_ylim(-lim * 2.4, lim)           # lợi suất ở nửa trên
    ax.set_yticks([-round(lim), 0, round(lim)])
    ax2 = ax.twinx()
    ax2.fill_between(x[:k], 0, v[:k], color=ACC, alpha=0.18)
    ax2.plot(x[:k], v[:k], color=ACC, lw=2.6)
    ax2.set_ylim(0, v.max() * 2.3)          # biến động ở nửa dưới
    ax2.set_yticks([0, round(v.min()), round(v.max())])
    ax.set_xlim(0, n); ax.set_ylabel("lợi suất ngày %"); ax2.set_ylabel("σ năm hoá %", color=ACC)
    ax.set_xlabel("phiên"); ax.grid(False)
    _style(ax2)


def surface_garch(s, v):
    vol = s["vol"][::4] / math.sqrt(252)
    t = np.arange(len(vol)) * 4
    y = np.linspace(-0.08, 0.08, 60)
    T, Y = np.meshgrid(t, y)
    S = np.broadcast_to(vol, T.shape)
    Z = np.exp(-0.5 * (Y / S) ** 2) / (S * math.sqrt(2 * math.pi))
    return {"X": T, "Y": Y * 100, "Z": Z, "xl": "phiên", "yl": "lợi suất %", "zl": "mật độ"}


# =============================================================== Hurst exponent
def hurst_demo(seed=1, n=3000):
    rng = np.random.default_rng(seed)
    e = rng.normal(size=n)
    mr, inc = np.zeros(n), np.zeros(n)
    for t in range(1, n):
        mr[t] = 0.9*mr[t-1] + e[t]    # hồi quy
        inc[t] = 0.9*inc[t-1] + e[t]  # quán tính
    walk, trend = np.cumsum(e), np.cumsum(inc)
    lags = np.arange(2, 50)
    def H(x):  # độ dốc log(σ_τ) theo log(τ)
        sd = [np.std(x[l:] - x[:-l]) for l in lags]
        return np.polyfit(np.log(lags), np.log(sd), 1)[0]
    return H(walk), H(mr), H(trend), (walk, mr, trend, lags)


def compute_hurst(seed=1, returns=None):
    h_rw, h_mr, h_tr, (walk, mr, tr, lags) = hurst_demo(seed)
    values = {"h_walk": h_rw, "h_meanrev": h_mr, "h_trend": h_tr, "n_lags": int(len(lags))}
    if returns is not None:
        x = np.cumsum(np.asarray(returns, float))
        sd = [np.std(x[l:] - x[:-l]) for l in lags]
        values["h_real"] = float(np.polyfit(np.log(lags), np.log(sd), 1)[0])
    formats = {k: "num2" for k in values}; formats["n_lags"] = "int"
    return values, formats, {"walk": walk, "mr": mr, "tr": tr, "lags": lags}


def plot2d_hurst(ax, s, upto=1.0):
    n = len(s["walk"]); k = max(2, int(n * upto))
    for key, c, lab in (("tr", POS, "xu hướng"), ("walk", MUT, "ngẫu nhiên"), ("mr", ACC, "hồi quy")):
        y = s[key][:k]
        ax.plot(np.arange(k), y - y[0], color=c, lw=1.8, label=lab)
    allv = np.concatenate([s[k] - s[k][0] for k in ("tr", "walk", "mr")])
    ax.set_xlim(0, n); ax.set_ylim(allv.min() * 1.05, allv.max() * 1.05)
    ax.legend(loc="upper left", fontsize=18, frameon=False, labelcolor=TXT)
    ax.set_xlabel("bước thời gian")


def surface_hurst(s, v):
    n = 1500; x = np.arange(0, n, 5)
    lines = []
    for i, (key, c) in enumerate((("mr", ACC), ("walk", MUT), ("tr", POS))):
        z = s[key][:n:5] - s[key][0]
        lines.append((x, np.full(len(x), i), z, c))
    return {"lines": lines, "xl": "bước", "yl": "", "zl": "giá trị", "yticks": ["hồi quy", "ngẫu nhiên", "quán tính"]}


# =============================================================== Ornstein–Uhlenbeck
def ou_demo(seed=1, n=1000):
    rng = np.random.default_rng(seed)
    theta, mu, sigma = 0.10, 0.0, 0.6
    x = np.zeros(n); x[0] = 4.0
    for t in range(1, n):
        x[t] = (x[t-1] + theta*(mu - x[t-1])
                + sigma*rng.normal())
    b, a = np.polyfit(x[:-1], x[1:], 1)  # AR(1)
    theta_hat = -np.log(b)
    half_life = np.log(2) / theta_hat
    return x, theta, theta_hat, half_life, a/(1-b)


def compute_ou(seed=1, returns=None):
    x, th, th_hat, hl, mu_hat = ou_demo(seed)
    values = {"theta_true": th, "theta_hat": float(th_hat), "half_life": float(hl), "mu_hat": float(mu_hat),
              "half_life_true": math.log(2) / th,
              "start": float(x[0]), "n_days": len(x), "band": float(2 * x[50:].std())}
    formats = {"theta_true": "num2", "theta_hat": "num2", "half_life": "num1", "half_life_true": "num1", "mu_hat": "num2",
               "start": "num1", "n_days": "int", "band": "num1"}
    return values, formats, {"x": x}


def plot2d_ou(ax, s, upto=1.0):
    x = s["x"]; n = len(x); k = max(2, int(n * upto))
    sd = x[50:].std()
    ax.axhspan(-2 * sd, 2 * sd, color=POS, alpha=0.08)
    ax.axhline(0, color=MUT, lw=1, ls="--")
    ax.plot(np.arange(k), x[:k], color=ACC, lw=2)
    ax.set_xlim(0, n); ax.set_ylim(x.min() - 1, x.max() + 1); ax.set_xlabel("phiên"); ax.set_ylabel("spread")


def surface_ou(s, v):
    th, mu, sig, x0 = 0.10, 0.0, 0.6, 4.0
    t = np.linspace(0, 60, 60); y = np.linspace(-6, 7, 70)
    T, Y = np.meshgrid(t, y)
    m = mu + (x0 - mu) * np.exp(-th * T)
    var = sig ** 2 / (2 * th) * (1 - np.exp(-2 * th * T)) + 1e-3
    Z = np.exp(-0.5 * (Y - m) ** 2 / var) / np.sqrt(2 * np.pi * var)
    return {"X": T, "Y": Y, "Z": Z, "xl": "phiên", "yl": "spread", "zl": "mật độ"}


# =============================================================== HMM regimes (filtered)
def hmm_demo(seed=5, n=600):
    rng = np.random.default_rng(seed)
    mu = np.array([.0012, -.0020, .0001])  # tăng/giảm/ngang
    sd = np.array([.009, .022, .006])
    P = np.array([[.97, .01, .02], [.02, .95, .03],
                  [.02, .02, .96]])
    z = [0]
    for _ in range(n - 1):
        z.append(rng.choice(3, p=P[z[-1]]))
    r = rng.normal(mu[z], sd[z])
    a, probs = np.ones(3) / 3, []
    for x in r:            # lọc tiến P(z_t | x_1..t)
        lik = np.exp(-.5*((x - mu)/sd)**2) / sd
        a = (a @ P) * lik; a /= a.sum(); probs.append(a)
    return np.array(probs), np.array(z), r, P


def compute_hmm(seed=5, returns=None):
    probs, z, r, P = hmm_demo(seed)
    dom = probs.argmax(1)
    values = {"p_bull_last": float(probs[-1, 0]), "p_bear_last": float(probs[-1, 1]), "p_side_last": float(probs[-1, 2]),
              "p_dom_last": float(probs[-1].max()), "stay_bull": float(P[0, 0]), "stay_bear": float(P[1, 1]),
              "accuracy": float((dom == z).mean()), "n_days": len(r),
              "bull_len": 1 / (1 - P[0, 0]), "bear_len": 1 / (1 - P[1, 1])}
    formats = {k: "pct0" for k in values}
    formats.update({"n_days": "int", "bull_len": "num0", "bear_len": "num0", "stay_bull": "num2", "stay_bear": "num2"})
    return values, formats, {"probs": probs, "z": z, "r": r}


def plot2d_hmm(ax, s, upto=1.0):
    p = s["probs"]; n = len(p); k = max(2, int(n * upto)); x = np.arange(k)
    ax.stackplot(x, p[:k, 0], p[:k, 2], p[:k, 1], colors=[POS, NEU, NEG], alpha=0.85,
                 labels=["tăng", "đi ngang", "giảm"])
    ax.set_xlim(0, n); ax.set_ylim(0, 1); ax.set_ylabel("xác suất trạng thái"); ax.set_xlabel("phiên")
    ax.legend(loc="upper left", fontsize=18, frameon=False, labelcolor=TXT, ncol=3)


def surface_hmm(s, v):
    p = s["probs"]
    return {"line": (p[:, 0], p[:, 1], p[:, 2]), "xl": "P(tăng)", "yl": "P(giảm)", "zl": "P(ngang)",
            "colors": [POS, NEG, NEU][0:1]}


# =============================================================== Monte Carlo (GBM)
def monte_carlo_demo(seed=21, paths=1000, days=60):
    rng = np.random.default_rng(seed)
    s0, mu, sigma, dt = 100.0, 0.10, 0.35, 1/252
    z = rng.normal(size=(paths, days))
    step = ((mu - sigma**2/2)*dt
            + sigma*np.sqrt(dt)*z)
    S = s0 * np.exp(np.cumsum(step, axis=1))
    end = S[:, -1]
    p5, p50, p95 = np.percentile(end, [5, 50, 95])
    prob_loss = (end < s0).mean()
    return S, p5, p50, p95, prob_loss


def compute_monte_carlo(seed=21, returns=None):
    S, p5, p50, p95, pl = monte_carlo_demo(seed)
    values = {"p5": p5, "p50": p50, "p95": p95, "prob_loss": pl, "n_paths": S.shape[0], "days": S.shape[1],
              "s0": 100.0, "sigma": 0.35, "worst": float(S[:, -1].min()), "best": float(S[:, -1].max())}
    formats = {"p5": "num1", "p50": "num1", "p95": "num1", "prob_loss": "pct0", "n_paths": "int", "days": "int",
               "s0": "num0", "sigma": "pct0", "worst": "num1", "best": "num1"}
    return values, formats, {"S": S}


def plot2d_monte_carlo(ax, s, upto=1.0):
    S = s["S"]; d = S.shape[1]; k = max(2, int(d * upto)); x = np.arange(1, k + 1)
    for i in range(0, 200):
        ax.plot(x, S[i, :k], color=MUT, lw=0.6, alpha=0.25)
    lo, mid, hi = np.percentile(S[:, :k], [5, 50, 95], axis=0)
    ax.fill_between(x, lo, hi, color=ACC, alpha=0.18)
    ax.plot(x, mid, color=ACC, lw=2.6)
    ax.axhline(100, color=TXT, lw=1, ls="--", alpha=0.6)
    ax.set_xlim(1, d); ax.set_ylim(S[:, -1].min() * 0.95, np.percentile(S[:, -1], 99.5)); ax.set_xlabel("phiên"); ax.set_ylabel("giá")


def surface_monte_carlo(s, v):
    S = s["S"]; days = S.shape[1]
    bins = np.linspace(50, 170, 60); t = np.arange(2, days, 2)
    Z = np.array([np.histogram(S[:, i], bins=bins, density=True)[0] for i in t]).T
    T, Y = np.meshgrid(t, (bins[:-1] + bins[1:]) / 2)
    return {"X": T, "Y": Y, "Z": Z, "xl": "phiên", "yl": "giá", "zl": "mật độ"}


# =============================================================== Sharpe ratio
def sharpe_demo(seed=12, n=750):
    rng = np.random.default_rng(seed)
    a = rng.normal(0.0006, 0.010, n)  # chiến lược A
    b = rng.normal(0.0009, 0.022, n)  # chiến lược B
    def sharpe(r, rf=0.0):
        ex = r - rf/252
        return ex.mean()/ex.std(ddof=1) * np.sqrt(252)
    def cagr(r):
        return np.prod(1 + r)**(252/len(r)) - 1
    return sharpe(a), sharpe(b), cagr(a), cagr(b), a, b


def compute_sharpe(seed=12, returns=None):
    sa, sb, ca, cb, a, b = sharpe_demo(seed)
    dd = lambda r: float((np.cumprod(1 + r) / np.maximum.accumulate(np.cumprod(1 + r)) - 1).min())
    values = {"sharpe_a": sa, "sharpe_b": sb, "mean_a": a.mean(), "mean_b": b.mean(), "cagr_a": ca, "cagr_b": cb, "vol_a": a.std() * math.sqrt(252),
              "vol_b": b.std() * math.sqrt(252), "dd_a": dd(a), "dd_b": dd(b), "n_days": len(a)}
    formats = {"sharpe_a": "num2", "sharpe_b": "num2", "mean_a": "pct2", "mean_b": "pct2", "cagr_a": "pct1", "cagr_b": "pct1", "vol_a": "pct0",
               "vol_b": "pct0", "dd_a": "pct0", "dd_b": "pct0", "n_days": "int"}
    return values, formats, {"a": a, "b": b}


def plot2d_sharpe(ax, s, upto=1.0):
    n = len(s["a"]); k = max(2, int(n * upto)); x = np.arange(k)
    ax.plot(x, np.cumprod(1 + s["a"][:k]) * 100, color=POS, lw=2.4, label="A")
    ax.plot(x, np.cumprod(1 + s["b"][:k]) * 100, color=NEG, lw=1.8, label="B")
    full = np.concatenate([np.cumprod(1 + s["a"]), np.cumprod(1 + s["b"])]) * 100
    ax.set_ylim(full.min() * 0.95, full.max() * 1.05)
    ax.set_xlim(0, n); ax.set_xlabel("phiên"); ax.set_ylabel("NAV (gốc 100)")
    ax.legend(loc="upper left", fontsize=19, frameon=False, labelcolor=TXT)


def surface_sharpe(s, v):
    mu = np.linspace(0, 0.30, 40); sig = np.linspace(0.05, 0.50, 40)
    M, Sg = np.meshgrid(mu, sig)
    return {"X": M * 100, "Y": Sg * 100, "Z": M / Sg, "xl": "lợi nhuận năm %", "yl": "biến động năm %", "zl": "Sharpe"}


# =============================================================== VaR / CVaR
def var_cvar_demo(seed=13, n=2500, df=3):
    rng = np.random.default_rng(seed)
    r = rng.standard_t(df, n) * 0.012  # đuôi dày
    loss = -r
    out = {}
    for q, z in ((95, 1.645), (99, 2.326)):
        var = np.percentile(loss, q)       # lịch sử
        cvar = loss[loss >= var].mean()    # TB đuôi
        normal = -(r.mean() - z * r.std())  # giả định chuẩn
        out[q] = (var, cvar, normal)
    return out, loss.max(), r


def compute_var_cvar(seed=13, returns=None):
    out, w, r = var_cvar_demo(seed)
    if returns is not None:
        r = np.asarray(returns, float); loss = -r; w = float(loss.max())
        for q, z in ((95, 1.645), (99, 2.326)):
            v = float(np.percentile(loss, q))
            out[q] = (v, float(loss[loss >= v].mean()), float(-(r.mean() - z * r.std())))
    (v95, c95, n95), (v99, c99, n99) = out[95], out[99]
    values = {"var95": v95, "cvar95": c95, "var95_normal": n95, "var99": v99, "cvar99": c99, "var99_normal": n99,
              "worst": w, "n_days": len(r), "tail_days": int((-r >= v95).sum()), "cvar_over_var": c95 / v95,
              "underestimate": 1 - n99 / v99}
    formats = {k: "pct1" for k in values}
    formats.update({"n_days": "int", "tail_days": "int", "cvar_over_var": "num1", "underestimate": "pct0"})
    return values, formats, {"r": r, "var": v95, "cvar": c95}


def plot2d_var_cvar(ax, s, upto=1.0):
    loss = -s["r"] * 100
    bins = np.linspace(-8, 8, 90)
    h, e = np.histogram(loss, bins=bins)
    c = (e[:-1] + e[1:]) / 2; k = max(2, int(len(c) * upto))
    ax.bar(c[:k], h[:k], width=e[1] - e[0], color=[NEG if x >= s["var"] * 100 else MUT for x in c[:k]], alpha=0.85)
    if upto > 0.8:
        ax.axvline(s["var"] * 100, color=ACC, lw=2.4); ax.axvline(s["cvar"] * 100, color=NEG, lw=2.4, ls="--")
    ax.set_xlim(-8, 8); ax.set_xlabel("mức lỗ ngày %"); ax.set_ylabel("số phiên")


def surface_var_cvar(s, v):
    loss = -s["r"]
    alphas = np.linspace(0.90, 0.995, 30); hz = np.arange(1, 21)
    q = np.percentile(loss, alphas * 100)
    A, Hz = np.meshgrid(alphas, hz)
    Z = np.broadcast_to(q, A.shape) * np.sqrt(Hz)  # minh hoạ quy tắc căn thời gian
    return {"X": A * 100, "Y": Hz, "Z": Z * 100, "xl": "độ tin cậy %", "yl": "số phiên", "zl": "VaR %"}


# =============================================================== Kelly criterion
def kelly_demo(seed=4, bets=500, W=0.55, R=1.0):
    rng = np.random.default_rng(seed)
    f_star = W - (1 - W) / R
    fracs = [f_star/2, f_star, 2*f_star, 4*f_star]
    win = rng.random((2000, bets)) < W
    out = {}
    for f in fracs:
        step = np.where(win, 1 + f*R, 1 - f)
        out[f] = np.median(step.prod(axis=1))
    return f_star, fracs, out, win


def compute_kelly(seed=4, returns=None):
    f, fr, out, win = kelly_demo(seed)
    med = list(out.values())
    values = {"W": 0.55, "R": 1.0, "f_star": f, "half_kelly": fr[0], "double_kelly": fr[2], "quad_kelly": fr[3],
              "med_half": med[0], "med_full": med[1], "med_double": med[2], "med_quad": med[3], "bets": win.shape[1]}
    formats = {"W": "pct0", "R": "num0", "f_star": "pct0", "half_kelly": "pct0", "double_kelly": "pct0",
               "quad_kelly": "pct0", "med_half": "x1", "med_full": "x1", "med_double": "x1", "med_quad": "x2", "bets": "int"}
    return values, formats, {"fracs": fr, "win": win, "R": 1.0}


def plot2d_kelly(ax, s, upto=1.0):
    win = s["win"][:400]; bets = win.shape[1]; k = max(2, int(bets * upto)); x = np.arange(k)
    for f, c in zip(s["fracs"], [MUT, POS, NEU, NEG]):
        w = np.median(np.cumprod(np.where(win, 1 + f * s["R"], 1 - f), axis=1), axis=0)
        ax.plot(x, w[:k], color=c, lw=2.2, label=f"f = {f*100:.0f}%".replace(".", ","))
    ax.set_yscale("log"); ax.set_xlim(0, bets); ax.set_ylim(1e-3, 1e2); ax.set_xlabel("số lần đặt"); ax.set_ylabel("tài sản trung vị (log)")
    ax.legend(loc="upper left", fontsize=18, frameon=False, labelcolor=TXT)


def surface_kelly(s, v):
    f = np.linspace(0.0, 0.6, 50); W = np.linspace(0.45, 0.70, 40)
    F, Wm = np.meshgrid(f, W)
    G = Wm * np.log1p(F) + (1 - Wm) * np.log(np.clip(1 - F, 1e-6, None))
    return {"X": F * 100, "Y": Wm * 100, "Z": G * 100, "xl": "tỷ lệ cược f %", "yl": "tỷ lệ thắng W %", "zl": "tăng trưởng log %"}


# =============================================================== registry
TOPICS = ["garch", "hurst", "ou", "hmm", "monte_carlo", "sharpe", "var_cvar", "kelly"]


def _style(ax):
    ax.tick_params(colors=MUT, labelsize=18)
    for sp in ax.spines.values():
        sp.set_color(hex_(THEME["border"]))
    ax.yaxis.label.set_size(20); ax.xaxis.label.set_size(20)


class Model:
    def __init__(self, topic, seed=None, returns=None):
        if topic not in TOPICS:
            raise ValueError(f"unknown topic {topic}; known: {TOPICS}")
        g = globals()
        self.topic = topic
        demo = g[f"{topic}_demo"]
        sig = inspect.signature(demo)
        self.seed = seed if seed is not None else sig.parameters["seed"].default
        self.values, self.formats, self.series = g[f"compute_{topic}"](self.seed, returns)
        self.values = {k: (float(v) if isinstance(v, (np.floating, float)) else int(v) if isinstance(v, (np.integer, int)) else v)
                       for k, v in self.values.items()}
        self.code = inspect.getsource(demo).rstrip()
        self._plot2d = g[f"plot2d_{topic}"]
        self._surface = g[f"surface_{topic}"]
        self.real_data = returns is not None

    def plot2d(self, ax, upto=1.0):
        self._plot2d(ax, self.series, upto)
        _style(ax)

    def surface(self):
        return self._surface(self.series, self.values)


def load_returns(csv_path):
    """Read a CSV with a 'close' column (any case) and return daily simple returns."""
    import csv

    with open(csv_path, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    key = next(k for k in rows[0] if k.lower() in ("close", "dong_cua", "gia_dong_cua", "adj_close"))
    px = np.array([float(r[key].replace(",", "")) for r in rows if r[key]])
    return px[1:] / px[:-1] - 1


if __name__ == "__main__":
    # python models.py garch  → print every value (with its vi-VN format) usable as {placeholder}
    import sys

    from core import fmt_vi

    for t in (sys.argv[1:] or TOPICS):
        m = Model(t)
        print(f"\n# {t}  (seed {m.seed})")
        for k, v in m.values.items():
            print(f"  {{{k}}}".ljust(22), fmt_vi(v, m.formats.get(k, "num2")).ljust(12), f"[{m.formats.get(k, 'num2')}]")
