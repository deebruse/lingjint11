// 读取 CSV 文件
fetch('FUND_BASE.csv')
  .then(response => response.text())
  .then(csv => {
    const rows = csv.replace(/^\uFEFF/, '').trim().split('\n').map(r => r.split(','));
    const header = rows[0];
    const dataRows = rows.slice(1);
    
    let funds = dataRows.map(cols => {
      return {
        FundName: cols[0],
        Code: cols[1],
        Cost: parseFloat(cols[2]),
        Shares: parseFloat(cols[3]),
        TargetWeight: parseFloat(cols[4]),
        CurrentValue: parseFloat(cols[5]),
        High_3m: parseFloat(cols[6]),
      };
    });

    // 自动计算各项指标
    funds.forEach(f => {
      f.Amount = f.CurrentValue * f.Shares;
      f.Drawdown = (f.CurrentValue / f.High_3m) - 1;
    });

    // 计算组合总市值
    const totalAmount = funds.reduce((sum, f) => sum + f.Amount, 0);

    // 计算仓位
    funds.forEach(f => {
      f.CurrentWeight = f.Amount / totalAmount;
    });

    // 定义状态规则（简化版）
    function getStatus(f) {
      const d = f.Drawdown;

      if (d <= -0.15) return "strong";
      if (d <= -0.10) return "buy-2";
      if (d <= -0.07) return "buy-1";
      if (d <= -0.03) return "watch";
      return "normal";
    }

    funds.forEach(f => {
      f.Status = getStatus(f);
    });

    // 写入 HTML 表格
    const tbody = document.getElementById("fund-rows");
    tbody.innerHTML = "";

    funds.forEach(f => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${f.FundName}</td>
        <td>${f.CurrentValue.toFixed(4)}</td>
        <td>${f.Cost.toFixed(4)}</td>
        <td>${f.Shares.toFixed(2)}</td>
        <td>¥${f.Amount.toFixed(2)}</td>
        <td>${(f.Drawdown * 100).toFixed(2)}%</td>
        <td>${(f.CurrentWeight * 100).toFixed(2)}%</td>
        <td><span class="status-tag status-${f.Status}">${f.Status}</span></td>
        <td>${getAdvice(f.Status)}</td>
      `;

      tbody.appendChild(tr);
    });

    // 给不同状态提供建议
    function getAdvice(status) {
      switch(status) {
        case "strong": return "强补 1000–3000";
        case "buy-2": return "补 300–500";
        case "buy-1": return "小额补仓";
        case "watch": return "观察";
        default: return "持有";
      }
    }

    // 更新组合总览
    document.getElementById("total-amount").innerText = "¥" + totalAmount.toFixed(2);
  });

