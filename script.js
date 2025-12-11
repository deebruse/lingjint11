// ---- 工具函数：解析 CSV ----
function parseCSV(text) {
  const rows = text.trim().split(/\r?\n/);
  const header = rows[0].split(",");
  const dataRows = rows.slice(1);
  return dataRows
    .map((line) => line.split(","))
    .filter((cols) => cols.length >= 7)
    .map((cols) => ({
      FundName: cols[0],
      Code: cols[1],
      Cost: parseFloat(cols[2]) || 0,
      Shares: parseFloat(cols[3]) || 0,
      TargetWeight: parseFloat(cols[4]) || 0,
      CurrentValue: parseFloat(cols[5]) || 0,
      High_3m: parseFloat(cols[6]) || 0
    }));
}

// ---- 识别基金类型：核心 / 防守 / 高波动 ----
function classifyFund(name) {
  if (
    name.includes("科创") ||
    name.includes("现金流") ||
    name.includes("自由现金流") ||
    name.includes("标普") ||
    name.includes("纳指")
  ) {
    return "core"; // 三大腿 + 海外核心
  }
  if (
    name.includes("红利") ||
    name.includes("AU9999") ||
    name.includes("黄金") ||
    name.includes("债") ||
    name.includes("中债")
  ) {
    return "defense";
  }
  if (
    name.includes("人工智能") ||
    name.includes("机器人") ||
    name.includes("恒生科技")
  ) {
    return "highbeta";
  }
  return "core";
}

// ---- 根据名字做回撤阈值判断 ----
function getDrawdownStatus(fund, dd) {
  const name = fund.FundName;

  let watch = -3,
    buy1 = -5,
    buy2 = -7;

  // 高波动资产
  if (
    name.includes("科创") ||
    name.includes("人工智能") ||
    name.includes("机器人") ||
    name.includes("恒生科技") ||
    name.includes("纳指")
  ) {
    watch = -8;
    buy1 = -12;
    buy2 = -15;
  }

  // 黄金 / 债券 / 标普主要按结构，不按回撤操作
  if (
    name.includes("黄金") ||
    name.includes("AU9999") ||
    name.includes("债") ||
    name.includes("中债")
  ) {
    return { status: "normal", suggestion: "持有观望" };
  }

  if (dd === null || isNaN(dd)) {
    return { status: "normal", suggestion: "数据不足" };
  }

  if (dd <= buy2) {
    return { status: "strong", suggestion: "强补 1000–3000" };
  } else if (dd <= buy1) {
    return { status: "buy", suggestion: "补 300–500" };
  } else if (dd <= watch) {
    return { status: "watch", suggestion: "小额分批" };
  } else {
    return { status: "normal", suggestion: "持有" };
  }
}

// ---- 渲染逻辑 ----
function renderDashboard(funds) {
  // 计算市值等
  funds.forEach((f) => {
    f.Amount = f.CurrentValue * f.Shares;
    if (f.CurrentValue && f.High_3m) {
      f.Drawdown = f.CurrentValue / f.High_3m - 1;
    } else {
      f.Drawdown = null;
    }
  });

  const totalAmount = funds.reduce((sum, f) => sum + f.Amount, 0) || 0;
  funds.forEach((f) => {
    f.CurrentWeight = totalAmount ? f.Amount / totalAmount : 0;
  });

  // 组合指标：海外 / 防守 / 高波动
  let overseas = 0,
    defense = 0,
    highbeta = 0;

  funds.forEach((f) => {
    const name = f.FundName;
    const w = f.CurrentWeight;

    // 海外：标普500 / 纳指100 / 恒生科技
    if (name.includes("标普") || name.includes("纳指") || name.includes("恒生科技")) {
      overseas += w;
    }

    // 防守：红利 + 债券 + 黄金 + 中债
    if (
      name.includes("红利") ||
      name.includes("黄金") ||
      name.includes("AU9999") ||
      name.includes("债") ||
      name.includes("中债")
    ) {
      defense += w;
    }

    // 高波动：恒生科技 + AI + 机器人
    if (
      name.includes("恒生科技") ||
      name.includes("人工智能") ||
      name.includes("机器人")
    ) {
      highbeta += w;
    }
  });

  // 填充顶部日期
  const todayDate = document.getElementById("todayDate");
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (todayDate) todayDate.textContent = dateStr;

  // 填充组合概况
  const totalValueEl = document.getElementById("totalValue");
  const overseasEl = document.getElementById("overseasWeight");
  const defenseEl = document.getElementById("defenseWeight");
  const highbetaEl = document.getElementById("highBetaWeight");

  if (totalValueEl) totalValueEl.textContent = `¥${totalAmount.toFixed(2)}`;
  if (overseasEl) overseasEl.textContent = (overseas * 100).toFixed(1) + "%";
  if (defenseEl) defenseEl.textContent = (defense * 100).toFixed(1) + "%";
  if (highbetaEl) highbetaEl.textContent = (highbeta * 100).toFixed(1) + "%";

  // 三大核心腿：科创 / 自由现金流 / 红利
  function setReactor(nameKeyword, weightId, barId, signalId) {
    const fund = funds.find((f) => f.FundName.includes(nameKeyword));
    if (!fund) return;
    const w = fund.CurrentWeight * 100;
    const dd = fund.Drawdown;
    const statusObj = getDrawdownStatus(fund, dd ? dd * 100 : null);

    const wEl = document.getElementById(weightId);
    const barEl = document.getElementById(barId);
    const sigEl = document.getElementById(signalId);

    if (wEl) wEl.textContent = `当前 ${w.toFixed(1)}%`;
    if (barEl) barEl.style.width = Math.min(w, 120) + "%";
    if (sigEl) sigEl.textContent = `信号：${statusObj.suggestion}`;
  }

  setReactor("科创板", "kcWeight", "kcBar", "kcSignal");
  setReactor("自由现金流", "fcfWeight", "fcfBar", "fcfSignal");
  setReactor("红利", "divWeight", "divBar", "divSignal");

  // 信号列表
  const signalList = document.getElementById("signalList");
  if (signalList) {
    signalList.innerHTML = "";
    funds.forEach((f) => {
      const dd = f.Drawdown ? f.Drawdown * 100 : null;
      const { status, suggestion } = getDrawdownStatus(f, dd);
      f._status = status;
      f._suggestion = suggestion;

      const li = document.createElement("li");
      li.className = "signal-item";

      const nameSpan = document.createElement("span");
      nameSpan.className = "signal-name";
      nameSpan.textContent = f.FundName;

      const tagSpan = document.createElement("span");
      let cls = "signal-tag tag-normal";
      let text = "正常";

      if (status === "watch") {
        cls = "signal-tag tag-watch";
        text = "观察";
      } else if (status === "buy") {
        cls = "signal-tag tag-buy";
        text = "买入区";
      } else if (status === "strong") {
        cls = "signal-tag tag-strong";
        text = "强烈买入";
      }

      tagSpan.className = cls;
      tagSpan.textContent = text;

      li.appendChild(nameSpan);
      li.appendChild(tagSpan);
      signalList.appendChild(li);
    });
  }

  // 表格渲染
  const tbody = document.getElementById("fundTableBody");
  if (tbody) {
    tbody.innerHTML = "";
    funds.forEach((f) => {
      const tr = document.createElement("tr");
      tr.className = "fund-row";

      const type = classifyFund(f.FundName);
      const typeTd = document.createElement("td");
      typeTd.innerHTML = `
        <span class="fund-type-pill">
          <span class="type-dot ${
            type === "core"
              ? "type-core"
              : type === "defense"
              ? "type-defense"
              : "type-highbeta"
          }"></span>
          <span>${
            type === "core"
              ? "核心"
              : type === "defense"
              ? "防守"
              : "高波动"
          }</span>
        </span>
      `;
      tr.appendChild(typeTd);

      function td(text) {
        const cell = document.createElement("td");
        cell.textContent = text;
        return cell;
      }

      tr.appendChild(td(f.FundName));
      tr.appendChild(td(f.CurrentValue ? f.CurrentValue.toFixed(4) : "--"));
      tr.appendChild(td(f.Cost ? f.Cost.toFixed(4) : "--"));
      tr.appendChild(td(f.Shares ? f.Shares.toFixed(2) : "--"));
      tr.appendChild(td(f.Amount ? f.Amount.toFixed(2) : "--"));
      tr.appendChild(td(f.High_3m ? f.High_3m.toFixed(4) : "--"));

      // 回撤 & 颜色
      const ddTd = document.createElement("td");
      if (f.Drawdown != null) {
        const pct = (f.Drawdown * 100).toFixed(2) + "%";
        ddTd.textContent = pct;
        ddTd.className = f.Drawdown <= 0 ? "text-red" : "text-green";
      } else {
        ddTd.textContent = "--";
      }
      tr.appendChild(ddTd);

      // 仓位
      tr.appendChild(td((f.CurrentWeight * 100).toFixed(2) + "%"));

      // 状态 & 建议
      const stTd = document.createElement("td");
      stTd.textContent =
        f._status === "strong"
          ? "strong"
          : f._status === "buy"
          ? "buy"
          : f._status === "watch"
          ? "watch"
          : "normal";
      tr.appendChild(stTd);

      tr.appendChild(td(f._suggestion || "—"));

      tbody.appendChild(tr);
    });
  }

  const footerStatus = document.getElementById("footerStatus");
  if (footerStatus) {
    footerStatus.textContent = `冷噤舱在线 · 当前组合市值 ¥${totalAmount.toFixed(2)}`;
  }
}

// ---- 入口：读取 CSV 并启动 ----
fetch("FUND_BASE.csv")
  .then((resp) => resp.text())
  .then((text) => {
    const funds = parseCSV(text);
    renderDashboard(funds);
  })
  .catch((err) => {
    console.error("加载 FUND_BASE.csv 失败：", err);
    const footerStatus = document.getElementById("footerStatus");
    if (footerStatus) {
      footerStatus.textContent = "冷噤舱警告 · 无法读取 FUND_BASE.csv";
    }
  });