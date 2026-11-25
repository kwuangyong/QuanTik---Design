(() => {
  const lab = document.getElementById("lab");
  const panel = document.createElement("section");
  panel.className = "panel wide opt-scenario";
  panel.setAttribute("aria-labelledby", "scenario-heading");
  panel.innerHTML = `
    <div class="panelhead">
      <div><h2 id="scenario-heading">Lãi lỗ theo giá và thời gian</h2>
      <small>Vị thế mua một quyền chọn · Đơn vị điểm · Trước phí</small></div>
      <div class="scenario-days">
        <label for="scenario-elapsed">Ngày đánh giá <output for="scenario-elapsed" id="scenario-day-label"></output></label>
        <input id="scenario-elapsed" type="range" min="0" max="90" value="30" step="1">
      </div>
    </div>
    <div class="scenario-legend" aria-hidden="true">
      <span>Ngày đánh giá</span><span>Khi đáo hạn</span>
    </div>
    <div class="scenario-chart" role="img" aria-label="Đồ thị lãi lỗ của vị thế mua quyền chọn"></div>
    <div class="scenario-readout" aria-live="polite"></div>
    <details class="scenario-targets">
      <summary>Kịch bản giá −5%, 0%, +5%</summary>
      <div class="scroll"><table>
        <caption>Lãi lỗ trên mỗi quyền chọn, tính bằng điểm</caption>
        <thead><tr><th scope="col">Thay đổi giá</th><th scope="col" class="scenario-asset">Giá cơ sở</th><th scope="col">Ngày đánh giá</th><th scope="col">Khi đáo hạn</th></tr></thead>
        <tbody></tbody>
      </table></div>
    </details>`;
  lab.insertBefore(panel, lab.querySelector("footer"));
  const daySlider = panel.querySelector("input");
  const chart = panel.querySelector(".scenario-chart");
  const readout = panel.querySelector(".scenario-readout");
  const targets = panel.querySelector(".scenario-targets");
  const fmt = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
  const intrinsic = (s, k, put) => Math.max(0, put ? k - s : s - k);

  function draw() {
    if (lab.hidden) return;
    const {spot, strike, days, future, put, warrant, error, evaluate} = readOptionInputs();
    panel.hidden = warrant;
    const sensitivity = document.getElementById("warrant-sensitivity");
    sensitivity.hidden = !warrant;
    if (warrant) {
      const graph = document.getElementById("warrant-chart");
      const quote = document.getElementById("warrant-quote");
      graph.hidden = Boolean(error);
      quote.textContent = error || "";
      if (error) return;
      const xs = Array.from({length:61}, (_,i)=>spot * (.85 + .005*i));
      const bid = document.getElementById("warrant-bid");
      const ask = document.getElementById("warrant-ask");
      const fair = evaluate(spot);
      if (bid.value || ask.value) {
        if (!bid.validity.valid || !ask.validity.valid || !bid.value || !ask.value || ask.valueAsNumber < bid.valueAsNumber) {
          quote.textContent = "Nhập đủ bid và ask, với ask lớn hơn hoặc bằng bid.";
        } else {
          const mid = (ask.valueAsNumber + bid.valueAsNumber) / 2, diff = fair - mid;
          const {vol, ratio} = readOptionInputs();
          const implied = solveVolatility(v => evaluate(spot, v), mid);
          const bump = spot * 1e-4, delta = (evaluate(spot + bump) - evaluate(spot - bump)) / (2 * bump);
          const gearing = spot / (mid * ratio), breakeven = strike + mid * ratio;
          quote.textContent = "Chênh giá lý thuyết so với giá giữa bid và ask tự nhập: " + fmt.format(diff) + " VND/CW. " +
            (implied === null ? "Giá giữa nằm ngoài miền định giá của mô hình; không suy ra được biến động hàm ý. " :
              "Biến động hàm ý từ giá giữa: " + (implied * 100).toFixed(1) + "%/năm (đang nhập " + (vol * 100).toFixed(1) + "%). ") +
            "Đòn bẩy " + gearing.toFixed(2) + "×, đòn bẩy hiệu dụng " + (gearing * delta * ratio).toFixed(2) + "×. " +
            "Hòa vốn khi đáo hạn: " + fmt.format(breakeven) + " VND (" + ((breakeven / spot - 1) * 100).toFixed(1) + "% so với giá hiện tại). " +
            "Chênh bid–ask " + ((ask.valueAsNumber - bid.valueAsNumber) / mid * 100).toFixed(1) + "% giá giữa.";
        }
      }
      const axis = {gridcolor:"#2c4141", automargin:true};
      Plotly.react(graph, [
        {type:"scatter",mode:"lines",x:xs,y:xs.map(s=>evaluate(s)),line:{color:"#ffad75",width:2.5},hovertemplate:"%{y:.2f} VND/CW<extra>Giá lý thuyết</extra>"},
        {type:"scatter",mode:"markers",x:[spot],y:[fair],marker:{size:9,color:"#5ce2d4"},hovertemplate:"%{y:.2f} VND/CW<extra>Giá cơ sở đã nhập</extra>"}
      ], {
        paper_bgcolor:"transparent",plot_bgcolor:"transparent",font:{color:"#b7c7c3"},margin:{l:50,r:15,t:10,b:47},showlegend:false,
        xaxis:{...axis,title:"Giá cổ phiếu (VND)"},yaxis:{...axis,title:"Giá lý thuyết (VND/CW)"}
      }, {responsive:true,displayModeBar:false});
      return;
    }
    daySlider.max = String(days);
    const elapsed = daySlider.valueAsNumber;
    panel.querySelector("output").textContent = elapsed === days ? "Đáo hạn" : "+" + elapsed + " ngày";
    daySlider.setAttribute("aria-valuetext", "Sau " + elapsed + " ngày");
    if (error) {
      chart.hidden = true;
      targets.hidden = true;
      readout.textContent = error;
      return;
    }
    chart.hidden = false;
    targets.hidden = false;
    const entry = evaluate(spot);
    const breakeven = strike + (put ? -entry : entry);
    const scenario = value => evaluate(value, undefined, (days - elapsed) / 365) - entry;
    const expiryPnl = value => intrinsic(value, strike, put) - entry;
    const shocks = [-0.05, 0, 0.05];
    const targetPrices = shocks.map(shock => spot * (1 + shock));
    const low = Math.max(0.1, Math.min(spot * 0.85, strike * 0.95, breakeven * 0.97));
    const high = Math.max(spot * 1.15, strike * 1.05, breakeven * 1.03);
    const grid = Array.from({length: 121}, (_, i) => low + (high - low) * i / 120);
    const x = [...new Set([...grid, ...targetPrices, strike, breakeven].filter(value => value >= low && value <= high))].sort((a,b) => a-b);
    const makeTrace = (name, y, color, dash) => ({
      type: "scatter", mode: "lines", name, x, y, line: {color, dash, width: 2.5},
      hovertemplate: "%{y:.2f} điểm<extra>" + name + "</extra>"
    });
    const axis = {gridcolor:"#2c4141", automargin:true, zerolinecolor:"#536f68"};
    const label = future ? "Giá futures" : "Giá cơ sở";
    Plotly.react(chart, [
      makeTrace("Ngày đánh giá", x.map(scenario), "#ffad75", "solid"),
      makeTrace("Khi đáo hạn", x.map(expiryPnl), "#5ce2d4", "dot")
    ], {
      paper_bgcolor:"transparent", plot_bgcolor:"transparent", font:{color:"#b7c7c3"},
      margin:{l:50,r:15,t:10,b:47}, hovermode:"x unified", showlegend:false,
      xaxis:{...axis,title:label + " (điểm)"}, yaxis:{...axis,title:"Lãi lỗ (điểm)"},
      shapes:[{type:"line",x0:spot,x1:spot,y0:0,y1:1,yref:"paper",line:{color:"#748d87",width:1,dash:"dash"}}]
    }, {responsive:true, displayModeBar:false});
    panel.querySelector(".scenario-asset").textContent = label + " (điểm)";
    targets.querySelector("tbody").innerHTML = targetPrices.map((value, index) => {
      const change = ["−5%", "0%", "+5%"][index];
      return '<tr><th scope="row">' + change + '</th><td>' + fmt.format(value) +
        '</td><td>' + fmt.format(scenario(value)) + '</td><td>' +
        fmt.format(expiryPnl(value)) + '</td></tr>';
    }).join("");
    readout.textContent = "Phí quyền chọn theo mô hình " + fmt.format(entry) +
      " điểm · Hòa vốn khi đáo hạn " + fmt.format(breakeven) +
      " điểm · Lãi lỗ tại " + label.toLowerCase() + " hiện tại sau " +
      elapsed + " ngày: " + fmt.format(scenario(spot)) + " điểm.";
  }

  const simulationButton = document.getElementById("simulate-warrant");
  const simulationResult = document.getElementById("simulation-result");
  simulationButton.onclick = () => {
    const {spot, strike, vol, days, rate, yieldRate, ratio, fixings, error, evaluate} = readOptionInputs();
    if (error) { simulationResult.textContent = error; return; }
    const {mean, stderr} = simulateWarrant(spot, strike, vol, days/365, rate, yieldRate, ratio, fixings);
    const comparison = "Chênh với giá khớp hai mômen " + fmt.format(mean-evaluate(spot)) + " VND/CW.";
    simulationResult.textContent = "Monte Carlo " + fmt.format(mean) + " VND/CW · Sai số chuẩn " +
      fmt.format(stderr) + " VND/CW. " + comparison;
  };

  let frame = 0;
  function schedule() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(draw);
  }
  lab.addEventListener("input", () => {
    simulationResult.textContent = "20.000 đường mô phỏng theo lịch 5 phiên đã nhập.";
    schedule();
  });
  new MutationObserver(schedule).observe(lab, {attributes:true, attributeFilter:["hidden"]});
  schedule();
})();
