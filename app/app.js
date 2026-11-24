/* Thunder·HUB 启动台 */
(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const grid = $("#grid");
  const empty = $("#empty");
  const searchInput = $("#search");
  const toast = $("#toast");
  const menu = $("#menu");
  const veil = $("#modalVeil");
  const fName = $("#fName");
  const fPath = $("#fPath");
  const detectLine = $("#detectLine");
  const modalError = $("#modalError");
  const sidebar = $("#sidebar");
  const catList = $("#catList");
  const dropVeil = $("#dropVeil");

  let items = [];
  let cats = [];
  let activeCat = localStorage.getItem("bathub.cat") || "all";
  let menuItemId = null;
  let toastTimer = null;
  let renaming = false;

  /* ---------- 多语言 ---------- */
  const I18N = {
    zh: {
      search_ph: "搜一下收藏…",
      cats: "分类", new_cat: "新建分类", all: "全部", default_cat: "常用",
      del_cat: "删除分类", cat_name_ph: "分类名…", collapsed_tip: "收起 / 展开",
      empty_h2: "把常用的东西收进来",
      empty_p: "程序、脚本、文件夹、网址——双击之外，多一个从容的入口。",
      hint_add: "添加收藏", hint_drag: "直接收藏", hint_search: "搜索",
      hint_rename: "重命名", hint_menu: "更多操作", hint_hotkey: "呼出/隐藏",
      kbd_drag: "拖入", kbd_dbl: "双击名称", kbd_right: "右键",
      empty_add: "添加第一个收藏",
      menu_launch: "启动", menu_folder: "打开所在位置", menu_rename: "重命名",
      menu_movecat: "移到分类…", menu_remove: "移除", menu_back: "‹ 返回",
      add_stamp: "新收藏", add_title: "添加收藏",
      add_sub: "任何双击能启动的东西，都可以放进来。",
      add_name: "名称", add_name_em: "可留空，自动取文件名",
      add_name_ph: "例如：每日备份", add_path: "路径或网址",
      add_path_ph: "C:\\…\\tool.bat  或  https://…",
      browse: "浏览…", cancel: "取消", confirm_add: "收入启动台",
      detect: "识别为 → ",
      err_path: "请填写路径或网址。", err_add: "添加失败，请检查路径。",
      set_stamp: "偏好", set_title: "设置",
      set_sub: "开机自启、热键、关闭行为——都听你差遣。",
      set_autostart: "开机自动启动",
      set_autostart_d: "登录 Windows 后，Thunder·HUB 自动驻留系统托盘",
      set_hidden: "启动时只驻留托盘",
      set_hidden_d: "打开程序不弹主窗口，安静待在右下角（{hotkey} 随时唤出）",
      set_hotkey: "全局热键",
      set_hotkey_d: "任何界面按下组合键，呼出 / 隐藏主窗口",
      set_note_restart: "改动将在下次启动后生效",
      set_quit: "关闭窗口时直接退出",
      set_quit_d: "默认关闭只是收进托盘；开启后 Alt+F4 / 关闭即彻底退出",
      chip_tip: "点击后按下新的组合键", chip_listen: "按下组合键…",
      done: "完成",
      drop_h2: "松手，收入启动台",
      drop_p: "bat、exe、快捷方式、文件夹——拖进来就能点着开",
      ghost_t: "「{cat}」还空着",
      ghost_d: "把卡片拖进左侧分类，或右键卡片选「移到分类」",
      kind_app: "程序", kind_script: "脚本", kind_shortcut: "快捷方式",
      kind_folder: "文件夹", kind_link: "链接", kind_file: "文件",
      min_tip: "最小化", max_tip: "最大化 / 还原", close_tip: "收进系统托盘",
      set_tip: "设置",
      toast_launch: "已启动 · ", toast_launch_fail: "启动失败：",
      toast_unknown: "未知错误",
      toast_added: "已收入 · ", toast_added_n: "已收入 {n} 项收藏",
      toast_removed: "已移除 · ", toast_renamed: "已改名 · ",
      toast_cat_renamed: "分类已改名 · ", toast_cat_created: "已新建分类 · ",
      toast_cat_deleted: "已删除分类，卡片移到「常用」",
      toast_moved: "「{name}」已移到 · {cat}",
      toast_nopath: "取不到文件路径，请按 A 手动添加",
      toast_autostart_on: "已加入开机自启动",
      toast_autostart_off: "已取消开机自启动",
      toast_hotkey_set: "热键已改为 · {combo}（重启生效）",
      toast_need_mod: "至少需要一个修饰键（Ctrl / Alt / Shift / Win）",
      donate_tip: "请我喝杯咖啡",
      donate_stamp: "投喂", donate_title: "请作者喝杯咖啡",
      donate_sub: "Thunder·HUB 免费，且会一直免费。如果它帮你省了点时间，欢迎自愿投喂——金额随意，一句谢谢也很好。",
      donate_qr_empty: "二维码稍后放进来 · donate-qr.png",
      donate_copy: "复制", donate_copied: "邮箱已复制",
      donate_note: "完全自愿 · 不打赏也能一直用",
      tour_stamp: "指引",
      tour_welcome_t: "欢迎来到 Thunder·HUB",
      tour_welcome_d: "这里收纳你所有「双击就能打开」的东西——bat、程序、文件夹、网址。花 30 秒认识一下。",
      tour_add_t: "先装东西进来",
      tour_add_d: "直接把文件拖进窗口，或按 A 键手动添加。程序图标会自动识别，名字双击就能改。",
      tour_cat_t: "分好类，不乱",
      tour_cat_d: "左边是分类栏：新建分类、把卡片拖上去归类，点一下就只看这一类。东西再多也井井有条。",
      tour_hotkey_t: "随时呼出",
      tour_hotkey_d: "在任何界面按 {hotkey} 就能呼出 / 隐藏这个窗口。用完它会安静待在系统托盘里。",
      tour_next: "下一步", tour_prev: "上一步", tour_skip: "跳过", tour_done: "开用！",
      tour_replay: "重新观看新手指引",
      cfm_stamp: "确认",
      cfm_remove_t: "移除「{name}」？",
      cfm_remove_d: "只是从启动台移除，不会删除电脑里的原文件。",
      cfm_cat_t: "删除分类「{name}」？",
      cfm_cat_d: "分类下的卡片会移到「常用」。",
      cfm_ok: "删除",
      cat_menu_rename: "重命名分类",
      cat_menu_del: "删除分类",
      cat_menu_color: "换个颜色",
      hint_newcat: "新建分类",
      set_data: "数据",
      set_data_d: "导出备份，或从备份文件恢复分类和收藏",
      data_export: "导出…", data_import: "导入…",
      cfm_import_t: "导入并覆盖当前数据？",
      cfm_import_d: "将用备份文件替换现有的全部分类和收藏（当前数据会自动备份到 launcher-data.json.bak）。",
      cfm_import_ok: "导入",
      toast_exported: "已导出到 · {path}",
      toast_imported: "已导入 {items} 项收藏、{cats} 个分类",
      toast_import_bad: "文件格式不对，导入失败",
    },
    en: {
      search_ph: "Search…",
      cats: "Categories", new_cat: "New category", all: "All",
      default_cat: "General",
      del_cat: "Delete category", cat_name_ph: "Name…",
      collapsed_tip: "Collapse / Expand",
      empty_h2: "Collect your everyday launchers",
      empty_p: "Apps, scripts, folders, links — one calm place beyond double-clicking.",
      hint_add: "Add item", hint_drag: "Drop to collect", hint_search: "Search",
      hint_rename: "Rename", hint_menu: "More actions", hint_hotkey: "Show / Hide",
      kbd_drag: "Drop", kbd_dbl: "Double-click name", kbd_right: "Right-click",
      empty_add: "Add your first item",
      menu_launch: "Launch", menu_folder: "Open file location",
      menu_rename: "Rename", menu_movecat: "Move to category…",
      menu_remove: "Remove", menu_back: "‹ Back",
      add_stamp: "NEW", add_title: "Add item",
      add_sub: "Anything launchable with a double-click belongs here.",
      add_name: "Name", add_name_em: "optional — filename is used",
      add_name_ph: "e.g. Daily backup", add_path: "Path or URL",
      add_path_ph: "C:\\…\\tool.bat  or  https://…",
      browse: "Browse…", cancel: "Cancel", confirm_add: "Add to hub",
      detect: "Detected → ",
      err_path: "Please enter a path or URL.",
      err_add: "Failed to add. Check the path.",
      set_stamp: "PREFS", set_title: "Settings",
      set_sub: "Autostart, hotkeys, close behavior — your call.",
      set_autostart: "Launch at startup",
      set_autostart_d: "Thunder·HUB waits in the system tray when you sign in to Windows",
      set_hidden: "Start hidden in tray",
      set_hidden_d: "No window on launch — summon it anytime with {hotkey}",
      set_hotkey: "Global hotkey",
      set_hotkey_d: "Press the combo anywhere to show / hide the window",
      set_note_restart: "Applies after restart",
      set_quit: "Quit when window closes",
      set_quit_d: "By default closing hides to tray; enable to quit on Alt+F4 / close",
      chip_tip: "Click, then press a new combo", chip_listen: "Press combo…",
      done: "Done",
      drop_h2: "Drop to collect",
      drop_p: "bat, exe, shortcuts, folders — drop and launch",
      ghost_t: "'{cat}' is empty",
      ghost_d: "Drag cards onto a category, or right-click a card for 'Move to category'",
      kind_app: "App", kind_script: "Script", kind_shortcut: "Shortcut",
      kind_folder: "Folder", kind_link: "Link", kind_file: "File",
      min_tip: "Minimize", max_tip: "Maximize / Restore",
      close_tip: "Hide to tray", set_tip: "Settings",
      toast_launch: "Launched · ", toast_launch_fail: "Launch failed: ",
      toast_unknown: "unknown error",
      toast_added: "Added · ", toast_added_n: "Added {n} items",
      toast_removed: "Removed · ", toast_renamed: "Renamed · ",
      toast_cat_renamed: "Category renamed · ",
      toast_cat_created: "Category created · ",
      toast_cat_deleted: "Category deleted — cards moved to 'General'",
      toast_moved: "'{name}' moved to {cat}",
      toast_nopath: "Can't read file path — press A to add manually",
      toast_autostart_on: "Startup enabled",
      toast_autostart_off: "Startup disabled",
      toast_hotkey_set: "Hotkey set to {combo} (applies after restart)",
      toast_need_mod: "Need at least one modifier (Ctrl / Alt / Shift / Win)",
      donate_tip: "Buy me a coffee",
      donate_stamp: "KO-FI", donate_title: "Buy the author a coffee",
      donate_sub: "Thunder·HUB is free and always will be. If it saved you some time, a tip of any amount is warmly welcome — even a thank-you note counts.",
      donate_qr_empty: "QR code goes here · donate-qr.png",
      donate_copy: "Copy", donate_copied: "Email copied",
      donate_note: "Totally optional · free forever either way",
      tour_stamp: "TOUR",
      tour_welcome_t: "Welcome to Thunder·HUB",
      tour_welcome_d: "Home for everything that opens with a double-click — bats, apps, folders, links. Take a 30-second tour.",
      tour_add_t: "Fill it up first",
      tour_add_d: "Drag files straight into the window, or press A to add manually. Icons are detected automatically; double-click a name to rename.",
      tour_cat_t: "Sort it out",
      tour_cat_d: "The sidebar holds your categories: create one, drag cards onto it, click to focus. Stay tidy no matter how much you collect.",
      tour_hotkey_t: "Summon anytime",
      tour_hotkey_d: "Press {hotkey} anywhere to show / hide this window. When you're done it waits quietly in the system tray.",
      tour_next: "Next", tour_prev: "Back", tour_skip: "Skip", tour_done: "Let's go!",
      tour_replay: "Replay the tour",
      cfm_stamp: "SURE?",
      cfm_remove_t: "Remove '{name}'?",
      cfm_remove_d: "Only removed from the hub — the original file stays on your computer.",
      cfm_cat_t: "Delete category '{name}'?",
      cfm_cat_d: "Cards in it will move to 'General'.",
      cfm_ok: "Delete",
      cat_menu_rename: "Rename category",
      cat_menu_del: "Delete category",
      cat_menu_color: "Recolor",
      hint_newcat: "New category",
      set_data: "Data",
      set_data_d: "Export a backup, or restore categories and items from one",
      data_export: "Export…", data_import: "Import…",
      cfm_import_t: "Import and overwrite current data?",
      cfm_import_d: "The backup file replaces all current categories and items (your data is auto-backed up to launcher-data.json.bak).",
      cfm_import_ok: "Import",
      toast_exported: "Exported to {path}",
      toast_imported: "Imported {items} items, {cats} categories",
      toast_import_bad: "Invalid file format — import failed",
    },
  };

  let lang = "zh";
  const t = (key, vars) => {
    let s = (I18N[lang] && I18N[lang][key]) ?? I18N.zh[key] ?? key;
    if (vars) for (const k in vars) s = s.replaceAll("{" + k + "}", vars[k]);
    return s;
  };

  const KIND_IDS = ["app", "script", "shortcut", "folder", "link"];
  const kindLabel = (k) => KIND_IDS.includes(k) ? t("kind_" + k) : t("kind_file");

  const ICON_ALL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>';
  const ICON_FOLDER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>';
  const ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

  const api = async (url, body) => {
    const opt = body === undefined ? {} : {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    };
    const r = await fetch(url, opt);
    return r.json();
  };

  /* ---------- 提示条 ---------- */
  const showToast = (msg, isErr = false) => {
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.className = "toast" + (isErr ? " err" : "");
    toast.hidden = false;
    toastTimer = setTimeout(() => (toast.hidden = true), 2400);
  };

  const catName = (id) => {
    if (id === "all") return t("all");
    if (id === "default") return t("default_cat");
    return (cats.find((c) => c.id === id) || {}).name || t("default_cat");
  };

  const catCount = (id) =>
    id === "all" ? items.length : items.filter((i) => i.cat === id).length;

  /* ---------- 侧边栏 ---------- */
  const renderCats = () => {
    catList.innerHTML = "";
    const mk = (id, name, icon, isDefault, color) => {
      const b = document.createElement("button");
      b.className = "cat" + (activeCat === id ? " active" : "");
      b.dataset.cat = id;
      b.title = name;

      const ic = document.createElement("span");
      ic.className = "cat-ico";
      if (color) ic.style.color = color;
      ic.innerHTML = icon;
      const lbl = document.createElement("span");
      lbl.className = "lbl";
      lbl.textContent = name;
      const num = document.createElement("span");
      num.className = "num";
      num.textContent = catCount(id);

      b.append(ic, lbl, num);

      if (!isDefault) {
        const del = document.createElement("button");
        del.className = "cat-del";
        del.title = t("del_cat");
        del.innerHTML = ICON_X;
        del.addEventListener("click", async (e) => {
          e.stopPropagation();
          const okDel = await confirmDialog(
            t("cfm_cat_t", { name }), t("cfm_cat_d"));
          if (!okDel) return;
          await api("/api/cats/delete", { id });
          const moved = items.filter((i) => i.cat === id);
          moved.forEach((i) => (i.cat = "default"));
          cats = cats.filter((c) => c.id !== id);
          if (activeCat === id) setActiveCat("default");
          renderAll();
          showToast(t("toast_cat_deleted"));
        });
        b.appendChild(del);
      }

      b.addEventListener("click", () => setActiveCat(id));
      // 分类自身可拖拽排序（「全部」「常用」固定）
      if (!isDefault) {
        b.draggable = true;
        b.addEventListener("dragstart", (e) => {
          dragCatId = id;
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", "cat:" + id);
          b.classList.add("cat-dragging");
        });
        b.addEventListener("dragend", () => {
          dragCatId = null;
          catList.querySelectorAll(".cat").forEach((n) =>
            n.classList.remove("cat-dragging", "drop-before", "drop-after"));
        });
      }
      // 拖卡片到分类上 = 移动分类；拖分类到分类上 = 排序
      b.addEventListener("dragover", (e) => {
        if (dragId) {
          e.preventDefault();
          b.classList.add("drop-target");
        } else if (dragCatId && dragCatId !== id && !isDefault) {
          e.preventDefault();
          const r = b.getBoundingClientRect();
          const before = e.clientY < r.top + r.height / 2;
          b.classList.toggle("drop-before", before);
          b.classList.toggle("drop-after", !before);
        }
      });
      b.addEventListener("dragleave", () =>
        b.classList.remove("drop-target", "drop-before", "drop-after"));
      b.addEventListener("drop", async (e) => {
        e.preventDefault();
        b.classList.remove("drop-target", "drop-before", "drop-after");
        if (dragCatId && dragCatId !== id && !isDefault) {
          const r = b.getBoundingClientRect();
          const before = e.clientY < r.top + r.height / 2;
          const customs = cats.filter((c) => c.id !== "default");
          const from = customs.findIndex((c) => c.id === dragCatId);
          if (from < 0) return;
          const [moved] = customs.splice(from, 1);
          let to = customs.findIndex((c) => c.id === id);
          if (!before) to += 1;
          customs.splice(to, 0, moved);
          const def = cats.find((c) => c.id === "default");
          cats = def ? [def, ...customs] : customs;
          renderAll();
          await api("/api/cats/order", { ids: customs.map((c) => c.id) });
          dragCatId = null;
          return;
        }
        if (!dragId) return;
        await assignCat(dragId, id);
        dragId = null;
      });
      // 双击重命名（「全部」和「常用」不可改）
      if (id !== "all" && id !== "default") {
        b.addEventListener("dblclick", () => startCatRename(b, id, name));
      }
      return b;
    };

    catList.appendChild(mk("all", t("all"), ICON_ALL, true));
    cats.forEach((c) =>
      catList.appendChild(mk(
        c.id, c.id === "default" ? t("default_cat") : c.name,
        ICON_FOLDER, c.id === "default", c.color || "")));
  };

  /* 分类图标换色：循环调色板 */
  const CAT_COLORS = ["", "#d2401e", "#e8b84b", "#2f6f5e",
                      "#2e7bff", "#9b4dff", "#ff4f9a", "#ff6a00"];
  const cycleCatColor = async (cid) => {
    const cat = cats.find((c) => c.id === cid);
    if (!cat) return;
    const cur = CAT_COLORS.indexOf(cat.color || "");
    const next = CAT_COLORS[(cur + 1) % CAT_COLORS.length];
    cat.color = next;
    await api("/api/cats/color", { id: cid, color: next });
    renderCats();
  };

  const setActiveCat = (id) => {
    activeCat = id;
    localStorage.setItem("bathub.cat", id);
    renderAll();
  };

  /* 分类内联重命名 */
  function startCatRename(btn, id, oldName) {
    if (renaming) return;
    renaming = true;
    const lbl = btn.querySelector(".lbl");
    const input = document.createElement("input");
    input.className = "cat-rename";
    input.value = oldName;
    input.spellcheck = false;
    lbl.replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const finish = async (commit) => {
      if (done) return;
      done = true;
      renaming = false;
      const name = input.value.trim();
      if (commit && name && name !== oldName) {
        await api("/api/cats/rename", { id, name });
        const c = cats.find((x) => x.id === id);
        if (c) c.name = name;
        showToast(t("toast_cat_renamed") + name);
      }
      renderAll();
    };
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") finish(true);
      if (e.key === "Escape") finish(false);
    });
    input.addEventListener("blur", () => finish(true));
    input.addEventListener("click", (e) => e.stopPropagation());
  }

  /* 新建分类 */
  $("#catAddBtn").addEventListener("click", () => {
    if (renaming || sidebar.classList.contains("collapsed")) {
      if (sidebar.classList.contains("collapsed")) toggleCollapse();
      else return;
    }
    if (catList.querySelector(".cat-rename")) return;
    renaming = true;
    const row = document.createElement("div");
    row.className = "cat";
    const ic = document.createElement("span");
    ic.className = "cat-ico";
    ic.innerHTML = ICON_FOLDER;
    const input = document.createElement("input");
    input.className = "cat-rename";
    input.placeholder = t("cat_name_ph");
    input.spellcheck = false;
    row.append(ic, input);
    catList.appendChild(row);
    input.focus();
    let done = false;
    const finish = async (commit) => {
      if (done) return;
      done = true;
      renaming = false;
      const name = input.value.trim();
      row.remove();
      if (commit && name) {
        const r = await api("/api/cats", { name });
        if (r && r.id) {
          cats.push(r);
          setActiveCat(r.id);
          showToast(t("toast_cat_created") + r.name);
          return;
        }
      }
      renderAll();
    };
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") finish(true);
      if (e.key === "Escape") finish(false);
    });
    input.addEventListener("blur", () => finish(true));
  });

  /* 收起 / 展开 */
  const toggleCollapse = () => {
    sidebar.classList.toggle("collapsed");
    localStorage.setItem("bathub.sidebar",
      sidebar.classList.contains("collapsed") ? "1" : "0");
  };
  $("#collapseBtn").addEventListener("click", toggleCollapse);
  if (localStorage.getItem("bathub.sidebar") === "1") {
    sidebar.classList.add("collapsed");
  }

  /* 分类右键菜单：重命名 / 删除 */
  catList.addEventListener("contextmenu", (e) => {
    const b = e.target.closest(".cat");
    if (!b) return;
    const cid = b.dataset.cat;
    if (cid === "all" || cid === "default") return;
    e.preventDefault();
    menuItemId = null;
    menu.querySelectorAll("[data-act], .menu-sep").forEach((n) => (n.hidden = true));
    menu.querySelectorAll("[data-back]").forEach((n) => n.remove());
    const mkBtn = (label, danger, cb) => {
      const btn = document.createElement("button");
      btn.dataset.back = "1";
      btn.textContent = label;
      if (danger) btn.className = "danger";
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        hideMenu();
        cb();
      });
      menu.appendChild(btn);
    };
    mkBtn(t("cat_menu_rename"), false,
      () => startCatRename(b, cid, catName(cid)));
    mkBtn(t("cat_menu_color"), false, () => cycleCatColor(cid));
    mkBtn(t("cat_menu_del"), true, async () => {
      const okDel = await confirmDialog(
        t("cfm_cat_t", { name: catName(cid) }), t("cfm_cat_d"));
      if (!okDel) return;
      await api("/api/cats/delete", { id: cid });
      items.forEach((i) => { if (i.cat === cid) i.cat = "default"; });
      cats = cats.filter((c) => c.id !== cid);
      if (activeCat === cid) setActiveCat("default");
      renderAll();
      showToast(t("toast_cat_deleted"));
    });
    placeMenu(e.clientX, e.clientY);
  });

  /* ---------- 移动卡片到分类 ---------- */
  const assignCat = async (itemId, catId) => {
    const it = items.find((i) => i.id === itemId);
    if (!it || it.cat === catId) { renderAll(); return; }
    await api("/api/set-cat", { id: itemId, cat: catId });
    it.cat = catId;
    renderAll();
    showToast(t("toast_moved", { name: it.name, cat: catName(catId) }));
  };

  /* ---------- 渲染网格 ---------- */
  const glyphFor = (item) => {
    if (item.kind === "folder") return "❏";
    if (item.kind === "link") return "◈";
    if (item.kind === "script") return "›_";
    return (item.name || "?").trim().charAt(0).toUpperCase();
  };

  const canHaveIcon = (item) => ["app", "shortcut"].includes(item.kind);

  const render = () => {
    grid.innerHTML = "";
    const q = searchInput.value.trim().toLowerCase();

    const pool = activeCat === "all"
      ? items
      : items.filter((i) => i.cat === activeCat);

    pool.forEach((item, idx) => {
      const hit = !q ||
        item.name.toLowerCase().includes(q) ||
        item.path.toLowerCase().includes(q);

      const tile = document.createElement("div");
      tile.className = "tile" + (hit ? "" : " hidden");
      tile.dataset.id = item.id;
      tile.draggable = true;
      tile.style.animationDelay = Math.min(idx * 40, 320) + "ms";
      tile.title = item.path;

      const ico = document.createElement("div");
      ico.className = "tile-ico";
      if (canHaveIcon(item)) {
        const img = document.createElement("img");
        img.src = "/api/icon?path=" + encodeURIComponent(item.path);
        img.onerror = () => {
          img.remove();
          const g = document.createElement("span");
          g.className = "glyph";
          g.textContent = glyphFor(item);
          ico.appendChild(g);
        };
        ico.appendChild(img);
      } else {
        const g = document.createElement("span");
        g.className = "glyph";
        g.textContent = glyphFor(item);
        ico.appendChild(g);
      }

      const body = document.createElement("div");
      body.className = "tile-body";
      const name = document.createElement("div");
      name.className = "tile-name";
      name.textContent = item.name;
      const path = document.createElement("div");
      path.className = "tile-path";
      path.textContent = item.path;
      body.append(name, path);

      const kind = document.createElement("span");
      kind.className = "tile-kind";
      kind.textContent = kindLabel(item.kind);

      tile.append(ico, body, kind);
      grid.appendChild(tile);
    });

    // 空分类占位提示
    if (items.length && !pool.length) {
      const ghost = document.createElement("div");
      ghost.className = "tile tile-ghost";
      const p = document.createElement("p");
      p.innerHTML = `<strong>${t("ghost_t", { cat: catName(activeCat) })}</strong><br>${t("ghost_d")}`;
      ghost.appendChild(p);
      grid.appendChild(ghost);
    }

    empty.hidden = items.length !== 0;
    grid.style.display = items.length ? "" : "none";
  };

  const renderAll = () => { renderCats(); render(); };

  /* ---------- 应用语言 ---------- */
  const applyLang = () => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.placeholder = t(el.dataset.i18nPh);
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.title = t(el.dataset.i18nTitle);
    });
    const shd = $("#startHiddenDesc");
    if (shd) shd.textContent = t("set_hidden_d", { hotkey: comboLabel(comboCurrent) });
    const hk = $("#hintHotkeyKbd");
    if (hk) hk.textContent = comboLabel(comboCurrent).replace(/ /g, "");
    $("#tbLang").textContent = lang === "zh" ? "中" : "EN";
    renderAll();
  };

  /* 语言切换（设置齿轮旁） */
  $("#tbLang").addEventListener("click", async () => {
    lang = lang === "zh" ? "en" : "zh";
    applyLang();
    await api("/api/settings", { lang });
  });

  /* ---------- 启动 ---------- */
  const launch = async (id, tile) => {
    if (tile) {
      tile.classList.remove("launching");
      void tile.offsetWidth;
      tile.classList.add("launching");
    }
    const r = await api("/api/launch", { id });
    const item = items.find((i) => i.id === id);
    if (r.ok) showToast(t("toast_launch") + (item ? item.name : ""));
    else showToast(t("toast_launch_fail") + (r.error || t("toast_unknown")), true);
  };

  /* ---------- 事件：点击启动 / 双击名称重命名 ---------- */
  grid.addEventListener("click", (e) => {
    if (e.target.closest(".tile-rename")) return;
    const tile = e.target.closest(".tile");
    if (tile && tile.dataset.id) launch(tile.dataset.id, tile);
  });

  grid.addEventListener("dblclick", (e) => {
    const nameEl = e.target.closest(".tile-name");
    if (!nameEl) return;
    e.stopPropagation();
    const tile = nameEl.closest(".tile");
    const item = items.find((i) => i.id === tile.dataset.id);
    if (item) startRename(tile, item);
  });

  /* ---------- 卡片内联重命名 ---------- */
  function startRename(tile, item) {
    if (renaming) return;
    renaming = true;
    const nameEl = tile.querySelector(".tile-name");
    const input = document.createElement("input");
    input.className = "tile-rename";
    input.value = item.name;
    input.spellcheck = false;
    nameEl.replaceWith(input);
    input.focus();
    input.select();

    let done = false;
    const finish = async (commit) => {
      if (done) return;
      done = true;
      renaming = false;
      const name = input.value.trim();
      if (commit && name && name !== item.name) {
        await api("/api/rename", { id: item.id, name });
        item.name = name;
        showToast(t("toast_renamed") + name);
      }
      renderAll();
    };
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") finish(true);
      if (e.key === "Escape") finish(false);
    });
    input.addEventListener("blur", () => finish(true));
  }

  /* ---------- 二次确认弹窗 ---------- */
  const confirmVeil = $("#confirmVeil");
  let confirmResolve = null;
  const confirmDialog = (title, text, okLabel) => {
    $("#confirmStamp").textContent = t("cfm_stamp");
    $("#confirmTitle").textContent = title;
    $("#confirmText").textContent = text || "";
    $("#confirmOk").textContent = okLabel || t("cfm_ok");
    confirmVeil.hidden = false;
    return new Promise((resolve) => { confirmResolve = resolve; });
  };
  const settleConfirm = (v) => {
    confirmVeil.hidden = true;
    if (confirmResolve) { confirmResolve(v); confirmResolve = null; }
  };
  $("#confirmOk").addEventListener("click", () => settleConfirm(true));
  $("#confirmCancel").addEventListener("click", () => settleConfirm(false));
  confirmVeil.addEventListener("click", (e) => {
    if (e.target === confirmVeil) settleConfirm(false);
  });

  /* ---------- 右键菜单 ---------- */
  const hideMenu = () => { menu.hidden = true; menuItemId = null; };

  grid.addEventListener("contextmenu", (e) => {
    const tile = e.target.closest(".tile");
    if (!tile || !tile.dataset.id) return;
    e.preventDefault();
    menuItemId = tile.dataset.id;
    showMainMenu(e.clientX, e.clientY);
  });

  const placeMenu = (x, y) => {
    menu.hidden = false;
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    menu.style.left = Math.min(x, innerWidth - mw - 8) + "px";
    menu.style.top = Math.min(y, innerHeight - mh - 8) + "px";
  };

  const showMainMenu = (x, y) => {
    menu.querySelectorAll("[data-act], .menu-sep").forEach((n) => (n.hidden = false));
    const back = menu.querySelector("[data-back]");
    if (back) back.remove();
    placeMenu(x, y);
  };

  const showCatMenu = () => {
    menu.querySelectorAll("[data-act], .menu-sep").forEach((n) => (n.hidden = true));
    const old = menu.querySelector("[data-back]");
    if (old) old.remove();
    const frag = document.createDocumentFragment();
    const mkBtn = (label, cb, isBack) => {
      const b = document.createElement("button");
      b.dataset.back = "1";
      b.textContent = label;
      if (isBack) b.className = "danger";
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        cb();
      });
      return b;
    };
    cats.forEach((c) => {
      frag.appendChild(mkBtn("→ " + c.name, async () => {
        const id = menuItemId;
        hideMenu();
        await assignCat(id, c.id);
      }));
    });
    frag.appendChild(mkBtn(t("menu_back"), () => {
      const x = parseInt(menu.style.left), y = parseInt(menu.style.top);
      showMainMenu(x, y);
    }, true));
    menu.appendChild(frag);
    // 重新定位防止溢出
    placeMenu(parseInt(menu.style.left), parseInt(menu.style.top));
  };

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target)) hideMenu();
  });

  menu.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn || !menuItemId) return;
    const id = menuItemId;
    const item = items.find((i) => i.id === id);
    const act = btn.dataset.act;
    if (act !== "movecat") hideMenu();
    switch (act) {
      case "launch":
        launch(id, grid.querySelector(`[data-id="${id}"]`));
        break;
      case "folder":
        await api("/api/open-folder", { id });
        break;
      case "rename": {
        const tile = grid.querySelector(`[data-id="${id}"]`);
        if (tile && item) startRename(tile, item);
        break;
      }
      case "movecat":
        showCatMenu();
        break;
      case "remove": {
        const okDel = await confirmDialog(
          t("cfm_remove_t", { name: item ? item.name : "" }),
          t("cfm_remove_d"));
        if (!okDel) break;
        await api("/api/delete", { id });
        items = items.filter((i) => i.id !== id);
        renderAll();
        showToast(t("toast_removed") + (item ? item.name : ""));
        break;
      }
    }
  });

  /* ---------- 拖拽排序 / 拖到分类 ---------- */
  let dragId = null;
  let dragCatId = null;
  grid.addEventListener("dragstart", (e) => {
    const tile = e.target.closest(".tile");
    if (!tile || !tile.dataset.id) return;
    dragId = tile.dataset.id;
    tile.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });
  grid.addEventListener("dragend", () => {
    grid.querySelectorAll(".tile").forEach((t) =>
      t.classList.remove("dragging", "drop-target"));
    catList.querySelectorAll(".drop-target").forEach((c) =>
      c.classList.remove("drop-target"));
    dragId = null;
  });
  grid.addEventListener("dragover", (e) => {
    e.preventDefault();
    const tile = e.target.closest(".tile");
    grid.querySelectorAll(".drop-target").forEach((t) => t.classList.remove("drop-target"));
    if (tile && tile.dataset.id && tile.dataset.id !== dragId)
      tile.classList.add("drop-target");
  });
  grid.addEventListener("drop", async (e) => {
    e.preventDefault();
    const tile = e.target.closest(".tile");
    if (!tile || !tile.dataset.id || !dragId || tile.dataset.id === dragId) return;
    const from = items.findIndex((i) => i.id === dragId);
    const to = items.findIndex((i) => i.id === tile.dataset.id);
    items.splice(to, 0, items.splice(from, 1)[0]);
    dragId = null;
    renderAll();
    await api("/api/order", { order: items.map((i) => i.id) });
  });

  /* ---------- 添加弹层 ---------- */
  const detect = (p) => {
    const v = p.trim();
    if (!v) return null;
    if (/^https?:\/\//i.test(v)) return "link";
    if (/[\\/]$/.test(v) || /^[a-zA-Z]:[\\/]?$/.test(v)) return "folder";
    const ext = (v.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase();
    if (["bat", "cmd", "ps1", "vbs"].includes(ext)) return "script";
    if (ext === "exe") return "app";
    if (ext === "lnk") return "shortcut";
    return "file";
  };

  const updateDetect = () => {
    const k = detect(fPath.value);
    if (k) {
      detectLine.hidden = false;
      detectLine.textContent = t("detect") + kindLabel(k);
    } else {
      detectLine.hidden = true;
    }
    modalError.hidden = true;
  };

  const openModal = () => {
    fName.value = "";
    fPath.value = "";
    detectLine.hidden = true;
    modalError.hidden = true;
    veil.hidden = false;
    setTimeout(() => fPath.focus(), 60);
  };
  const closeModal = () => { veil.hidden = true; };

  $("#emptyAdd").addEventListener("click", openModal);
  $("#cancelBtn").addEventListener("click", closeModal);
  veil.addEventListener("click", (e) => { if (e.target === veil) closeModal(); });
  fPath.addEventListener("input", updateDetect);

  $("#browseBtn").addEventListener("click", async () => {
    const r = await api("/api/browse", {});
    if (r.path) {
      fPath.value = r.path;
      updateDetect();
      if (!fName.value) fName.focus();
    }
  });

  const confirmAdd = async () => {
    const path = fPath.value.trim();
    if (!path) {
      modalError.hidden = false;
      modalError.textContent = t("err_path");
      fPath.focus();
      return;
    }
    const cat = activeCat === "all" ? "default" : activeCat;
    const r = await api("/api/items", { name: fName.value.trim(), path, cat });
    if (r && r.id) {
      items.push(r);
      closeModal();
      renderAll();
      showToast(t("toast_added") + r.name);
    } else {
      modalError.hidden = false;
      modalError.textContent = t("err_add");
    }
  };
  $("#confirmBtn").addEventListener("click", confirmAdd);

  /* ---------- 搜索 ---------- */
  searchInput.addEventListener("input", render);

  /* ---------- 无边框窗口：自绘标题栏 ---------- */
  const wvApi = () => (window.pywebview && window.pywebview.api) || null;

  const setupWebview = () => {
    const wapi = wvApi();
    if (!wapi || document.body.classList.contains("has-webview")) return;
    document.body.classList.add("has-webview");
    $("#tbMin").addEventListener("click", () => wapi.minimize());
    const maxBtn = $("#tbMax");
    const doMax = async () => {
      try {
        const m = await wapi.toggle_maximize();
        maxBtn.classList.toggle("is-max", !!m);
      } catch (_) {}
    };
    maxBtn.addEventListener("click", doMax);
    $("#tbDrag").addEventListener("dblclick", doMax);
    $("#tbClose").addEventListener("click", () => wapi.hide_window());
  };

  /* ---------- 设置 ---------- */
  const settingsVeil = $("#settingsVeil");
  const swAutostart = $("#swAutostart");
  const swStartHidden = $("#swStartHidden");
  const swHotkey = $("#swHotkey");
  const swCloseQuit = $("#swCloseQuit");
  const hotkeyNote = $("#hotkeyNote");
  const hotkeyChip = $("#hotkeyChip");
  let hotkeyInitial = true;
  let comboInitial = "alt+d";
  let comboCurrent = comboInitial;

  const comboLabel = (c) =>
    String(c).split("+").filter(Boolean).map((p) => {
      const m = { alt: "Alt", ctrl: "Ctrl", shift: "Shift", win: "Win" }[p];
      if (m) return m;
      return p.length === 1 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1);
    }).join(" + ");

  const refreshHotkeyNote = () => {
    hotkeyNote.hidden =
      swHotkey.classList.contains("on") === hotkeyInitial &&
      comboCurrent === comboInitial;
  };

  /* 按键录制 */
  let listening = false;
  hotkeyChip.addEventListener("click", () => {
    if (listening) return;
    listening = true;
    hotkeyChip.classList.add("listening");
    hotkeyChip.textContent = t("chip_listen");

    const stop = () => {
      listening = false;
      hotkeyChip.classList.remove("listening");
      document.removeEventListener("keydown", capture, true);
    };
    const capture = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const key = e.key.toLowerCase();
      if (key === "escape") {
        stop();
        hotkeyChip.textContent = comboLabel(comboCurrent);
        return;
      }
      if (["control", "alt", "shift", "meta"].includes(key)) return; // 等主键

      const mods = [];
      if (e.ctrlKey) mods.push("ctrl");
      if (e.altKey) mods.push("alt");
      if (e.shiftKey) mods.push("shift");
      if (e.metaKey) mods.push("win");
      if (!mods.length) {
        showToast(t("toast_need_mod"), true);
        return;
      }
      const mainKey = key === " " ? "space"
        : key === "arrowup" ? "up"
        : key === "arrowdown" ? "down"
        : key === "arrowleft" ? "left"
        : key === "arrowright" ? "right"
        : key;
      const combo = [...mods, mainKey].join("+");
      const s = await api("/api/settings", { hotkey_combo: combo });
      stop();
      comboCurrent = s.hotkey_combo || combo;
      hotkeyChip.textContent = comboLabel(comboCurrent);
      refreshHotkeyNote();
      showToast(t("toast_hotkey_set", { combo: comboLabel(comboCurrent) }));
    };
    document.addEventListener("keydown", capture, true);
  });

  const setSwitch = (el, on) => {
    el.classList.toggle("on", !!on);
    el.setAttribute("aria-checked", on ? "true" : "false");
  };

  const bindSwitch = (el, key, after, map) => {
    el.addEventListener("click", async () => {
      const on = !el.classList.contains("on");
      setSwitch(el, on);
      const s = await api("/api/settings", { [key]: map ? map(on) : on });
      if (key === "autostart") setSwitch(el, s.autostart);
      if (after) after(on);
    });
  };

  const openSettings = async () => {
    const s = await api("/api/settings");
    setSwitch(swAutostart, s.autostart);
    setSwitch(swStartHidden, s.start_hidden);
    setSwitch(swHotkey, s.hotkey);
    setSwitch(swCloseQuit, s.close_action === "quit");
    hotkeyInitial = !!s.hotkey;
    comboInitial = comboCurrent = s.hotkey_combo || "alt+d";
    hotkeyChip.textContent = comboLabel(comboCurrent);
    hotkeyNote.hidden = true;
    settingsVeil.hidden = false;
  };

  $("#tbSettings").addEventListener("click", openSettings);
  bindSwitch(swAutostart, "autostart", (on) =>
    showToast(t(on ? "toast_autostart_on" : "toast_autostart_off")));
  bindSwitch(swStartHidden, "start_hidden");
  bindSwitch(swHotkey, "hotkey", refreshHotkeyNote);
  bindSwitch(swCloseQuit, "close_action", null, (on) => on ? "quit" : "hide");
  $("#settingsDone").addEventListener("click", () => { settingsVeil.hidden = true; });
  settingsVeil.addEventListener("click", (e) => {
    if (e.target === settingsVeil) settingsVeil.hidden = true;
  });
  $("#replayTour").addEventListener("click", () => {
    settingsVeil.hidden = true;
    startTour();
  });

  /* 数据导出 / 导入 */
  $("#exportBtn").addEventListener("click", async () => {
    const r = await api("/api/export", {});
    if (r && r.ok) showToast(t("toast_exported", { path: r.path }));
  });
  $("#importBtn").addEventListener("click", async () => {
    const okImport = await confirmDialog(
      t("cfm_import_t"), t("cfm_import_d"), t("cfm_import_ok"));
    if (!okImport) return;
    const r = await api("/api/import", {});
    if (r && r.ok) {
      settingsVeil.hidden = true;
      await refresh();
      showToast(t("toast_imported", { items: r.items, cats: r.cats }));
    } else if (r && r.error === "bad_file") {
      showToast(t("toast_import_bad"), true);
    }
  });

  /* ---------- 打赏卡片 ---------- */
  const DONATE_EMAIL = "Kwaneu96@qq.com";
  const donateVeil = $("#donateVeil");
  $("#donateEmail").textContent = DONATE_EMAIL;

  /* 撒花粒子：从卡片上沿中间向上喷射、左右散开、重力下坠（rAF 物理模拟） */
  const CONFETTI_COLORS = ["#ff2e17", "#ffb400", "#00c9a7", "#2e7bff",
                           "#9b4dff", "#ff4f9a", "#79d70f", "#ff6a00"];
  const CONFETTI_SHAPES = [
    "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",   // 菱形
    "polygon(22% 0, 100% 0, 78% 100%, 0 100%)",    // 平行四边形
    "polygon(18% 0, 82% 0, 100% 100%, 0 100%)",    // 梯形
    "polygon(0 0, 100% 0, 100% 100%, 0 100%)",     // 方片
  ];
  const confettiBurst = (n = 110) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const modal = document.querySelector(".donate-modal");
    const r = modal ? modal.getBoundingClientRect()
                    : { left: innerWidth / 2, top: innerHeight / 3, width: 0, height: 0 };
    const ox = r.left + r.width / 2;
    const oy = r.top + Math.min(90, r.height * 0.18);   // 卡片上半部分中间
    const parts = [];
    for (let i = 0; i < n; i++) {
      const c = document.createElement("i");
      c.className = "confetti";
      const size = 6 + Math.random() * 7;
      c.style.width = size + "px";
      c.style.height = size * (0.6 + Math.random() * 0.8) + "px";
      c.style.setProperty("--c", CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0]);
      c.style.setProperty("--shape", CONFETTI_SHAPES[(Math.random() * CONFETTI_SHAPES.length) | 0]);
      // 粒子落在弹窗遮罩内、卡片后方
      donateVeil.insertBefore(c, donateVeil.firstChild);
      const side = i % 2 === 0 ? -1 : 1;   // 左右交替喷出
      parts.push({
        el: c, x: ox, y: oy,
        vx: side * (60 + Math.random() * 430) + (Math.random() - 0.5) * 80,
        vy: -(520 + Math.random() * 490),
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 900,
        life: 1.5 + Math.random() * 0.9,
        t: 0,
      });
    }
    const G = 1900;   // 重力 px/s²
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      let alive = 0;
      for (const p of parts) {
        if (p.t >= p.life) continue;
        p.t += dt;
        p.vy += G * dt;           // 重力下坠
        p.vx *= 0.992;            // 空气阻力
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        const fadeStart = p.life * 0.7;
        p.el.style.opacity = p.t > fadeStart ? 1 - (p.t - fadeStart) / (p.life - fadeStart) : 1;
        p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)`;
        alive++;
      }
      if (alive) requestAnimationFrame(frame);
      else parts.forEach((p) => p.el.remove());
    };
    requestAnimationFrame(frame);
  };

  $("#donateBtn").addEventListener("click", () => {
    donateVeil.hidden = false;
    confettiBurst();
  });
  donateVeil.addEventListener("click", (e) => {
    if (e.target === donateVeil) donateVeil.hidden = true;
  });
  // 二维码缺失时显示虚线占位框
  const qrBox = $("#donateQr");
  const qrImg = $("#donateQrImg");
  qrImg.addEventListener("error", () => {
    qrImg.hidden = true;
    qrBox.classList.add("empty");
    $("#donateQrEmpty").hidden = false;
  });
  if (qrImg.complete && qrImg.naturalWidth === 0) {
    qrImg.hidden = true;
    qrBox.classList.add("empty");
    $("#donateQrEmpty").hidden = false;
  }
  $("#donateCopy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(DONATE_EMAIL);
      showToast(t("donate_copied"));
    } catch (_) {
      showToast(DONATE_EMAIL);
    }
  });
  document.addEventListener("pywebviewready", setupWebview);
  // 兜底：事件若错过则轮询注入
  const wvPoll = setInterval(() => {
    if (wvApi()) { setupWebview(); clearInterval(wvPoll); }
  }, 200);
  setTimeout(() => clearInterval(wvPoll), 8000);

  /* ---------- 键盘 ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!tourOverlay.hidden) { endTour(); return; }
      if (!veil.hidden) closeModal();
      if (!settingsVeil.hidden) settingsVeil.hidden = true;
      if (!donateVeil.hidden) donateVeil.hidden = true;
      hideMenu();
      searchInput.blur();
      return;
    }
    const typing = ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName);
    if (typing) {
      if (e.key === "Enter" && veil.hidden === false) confirmAdd();
      return;
    }
    if (e.key === "/") {
      e.preventDefault();
      searchInput.focus();
    } else if (e.altKey && e.key.toLowerCase() === "n") {
      e.preventDefault();
      $("#catAddBtn").click();
    } else if (!e.altKey && e.key.toLowerCase() === "a") {
      openModal();
    } else if (e.key === "Enter") {
      const first = grid.querySelector(".tile:not(.hidden):not(.tile-ghost)");
      if (first && first.dataset.id) launch(first.dataset.id, first);
    }
  });

  /* ---------- 拖文件进来收藏 ---------- */
  let dragDepth = 0;

  const hasFiles = (e) =>
    e.dataTransfer && [...e.dataTransfer.types].includes("Files");

  window.addEventListener("dragenter", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth = 0;
    dropVeil.hidden = false;
  });
  window.addEventListener("dragleave", (e) => {
    if (!hasFiles(e)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) dropVeil.hidden = true;
  });
  window.addEventListener("dragover", (e) => {
    if (hasFiles(e)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  });

  /* 无边框窗口：真实路径由后端（pywebview 桥）送回 */
  let lastDropHandled = 0;
  window.__bathubDropPaths = async (paths) => {
    if (!Array.isArray(paths) || !paths.length) return;
    lastDropHandled = Date.now();
    const targetCat = activeCat === "all" ? "default" : activeCat;
    let added = 0;
    for (const p of paths) {
      const r = await api("/api/items", { name: "", path: p, cat: targetCat });
      if (r && r.id) { items.push(r); added++; }
    }
    if (added) {
      renderAll();
      showToast(t("toast_added_n", { n: added }));
    }
  };

  window.addEventListener("drop", async (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth = 0;
    dropVeil.hidden = true;

    const files = [...e.dataTransfer.files];

    if (wvApi()) {
      // 交给后端 pywebview 通道取真实路径，超时无响应则提示
      const before = lastDropHandled;
      setTimeout(() => {
        if (lastDropHandled === before && files.length) {
          showToast(t("toast_nopath"), true);
        }
      }, 900);
      return;
    }

    // 浏览器回退模式：尽力从各通道解析路径
    let added = 0;
    for (const f of files) {
      const p = f.path || f.pywebview_full_path || "";
      if (!p) continue;
      const r = await api("/api/items", { name: "", path: p, cat: activeCat === "all" ? "default" : activeCat });
      if (r && r.id) { items.push(r); added++; }
    }
    if (!added && files.length) {
      const uri = e.dataTransfer.getData("text/uri-list") ||
                  e.dataTransfer.getData("text/plain") || "";
      const lines = uri.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      for (const line of lines) {
        let p = "";
        if (/^file:\/\/\//i.test(line)) {
          try { p = decodeURIComponent(new URL(line).pathname); } catch (_) {}
          p = p.replace(/^\/+/, "").replace(/\//g, "\\");
        } else if (/^[a-zA-Z]:[\\/]/.test(line)) {
          p = line;
        }
        if (p) {
          const r = await api("/api/items", { name: "", path: p, cat: activeCat === "all" ? "default" : activeCat });
          if (r && r.id) { items.push(r); added++; }
        }
      }
    }
    if (added) {
      renderAll();
      showToast(t("toast_added_n", { n: added }));
    } else {
      showToast(t("toast_nopath"), true);
    }
  });

  /* ---------- 新手引导 ---------- */
  const tourOverlay = $("#tourOverlay");
  const tourHole = $("#tourHole");
  const tourCard = $("#tourCard");
  let tourStep = 0;

  const tourSteps = () => [
    { target: null, title: t("tour_welcome_t"), text: t("tour_welcome_d") },
    { target: "#stage", title: t("tour_add_t"), text: t("tour_add_d") },
    { target: "#sidebar", title: t("tour_cat_t"), text: t("tour_cat_d") },
    { target: null, title: t("tour_hotkey_t"),
      text: t("tour_hotkey_d", { hotkey: comboLabel(comboCurrent) }) },
  ];

  const renderTourStep = () => {
    const steps = tourSteps();
    const s = steps[tourStep];
    $("#tourTitle").textContent = s.title;
    $("#tourText").textContent = s.text;
    $("#tourPrev").hidden = tourStep === 0;
    $("#tourNext").textContent =
      tourStep === steps.length - 1 ? t("tour_done") : t("tour_next");
    const dots = $("#tourDots");
    dots.innerHTML = "";
    steps.forEach((_, i) => {
      const d = document.createElement("i");
      if (i === tourStep) d.className = "on";
      dots.appendChild(d);
    });

    const pad = 8;
    if (s.target) {
      const el = document.querySelector(s.target);
      const r = el.getBoundingClientRect();
      tourOverlay.classList.remove("dim");
      tourHole.hidden = false;
      tourHole.style.left = (r.left - pad) + "px";
      tourHole.style.top = (r.top - pad) + "px";
      tourHole.style.width = (r.width + pad * 2) + "px";
      tourHole.style.height = (r.height + pad * 2) + "px";
      // 卡片放在高亮区附近
      const cardW = 300, cardH = 210;
      let left = r.left + r.width / 2 - cardW / 2;
      left = Math.max(12, Math.min(left, innerWidth - cardW - 12));
      let top = r.bottom + 16;
      if (top + cardH > innerHeight - 12) top = r.top - cardH - 16;
      if (top < 12) top = 12;
      tourCard.style.left = left + "px";
      tourCard.style.top = top + "px";
    } else {
      tourOverlay.classList.add("dim");
      tourHole.hidden = true;
      tourCard.style.left = (innerWidth / 2 - 150) + "px";
      tourCard.style.top = Math.max(80, innerHeight / 2 - 130) + "px";
    }
  };

  const endTour = async () => {
    tourOverlay.hidden = true;
    await api("/api/settings", { onboarded: true });
  };

  const startTour = () => {
    tourStep = 0;
    tourOverlay.hidden = false;
    renderTourStep();
  };

  $("#tourNext").addEventListener("click", async () => {
    if (tourStep >= tourSteps().length - 1) {
      await endTour();
      confettiBurst(70);
      showToast(lang === "zh" ? "导览完成，随便玩！" : "Tour done — have fun!");
      return;
    }
    tourStep++;
    renderTourStep();
  });
  $("#tourPrev").addEventListener("click", () => {
    if (tourStep > 0) { tourStep--; renderTourStep(); }
  });
  $("#tourSkip").addEventListener("click", endTour);

  /* ---------- 初始化 ---------- */
  const refresh = async () => {
    const s = await api("/api/settings");
    lang = s.lang || "zh";
    comboInitial = comboCurrent = s.hotkey_combo || "alt+d";
    const [its, cts] = await Promise.all([api("/api/items"), api("/api/cats")]);
    items = its;
    cats = cts;
    if (activeCat !== "all" && !cats.some((c) => c.id === activeCat)) {
      activeCat = "all";
    }
    applyLang();
    if (!s.onboarded) setTimeout(startTour, 700);
  };
  refresh();
})();
