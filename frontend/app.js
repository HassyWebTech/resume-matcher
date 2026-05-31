let extractedResumeText = "";

async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const uploadArea = document.getElementById("uploadArea");
  uploadArea.classList.add("active");

  try {
    if (file.type === "application/pdf") {
      extractedResumeText = await readPDF(file);
    } else if (file.name.endsWith(".docx")) {
      extractedResumeText = await readDOCX(file);
    } else if (file.type === "text/plain") {
      extractedResumeText = await readTXT(file);
    } else {
      showError("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
      return;
    }

    // Show success message
    const existing = document.getElementById("fileSuccess");
    if (existing) existing.remove();

    const success = document.createElement("div");
    success.id = "fileSuccess";
    success.className = "file-success";
    success.textContent = `✓ ${file.name} loaded successfully`;
    uploadArea.parentNode.insertBefore(success, uploadArea.nextSibling);

    // Clear textarea since file is loaded
    document.getElementById("resumeText").value = "";

  } catch (err) {
    showError("Failed to read file: " + err.message);
  }
}

async function readPDF(file) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = async () => {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item) => item.str).join(" ");
          fullText += pageText + "\n";
        }

        resolve(fullText.trim());
      } catch (err) {
        reject(err);
      }
    };
    script.onerror = () => reject(new Error("Failed to load PDF library"));
    document.head.appendChild(script);
  });
}

async function readDOCX(file) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
    script.onload = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        resolve(result.value.trim());
      } catch (err) {
        reject(err);
      }
    };
    script.onerror = () => reject(new Error("Failed to load DOCX library"));
    document.head.appendChild(script);
  });
}

async function readTXT(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result.trim());
    reader.onerror = () => reject(new Error("Failed to read text file"));
    reader.readAsText(file);
  });
}

function showError(message) {
  const error = document.getElementById("error");
  error.textContent = message;
  error.style.display = "block";
}

async function analyze() {
  const resumeTextArea = document.getElementById("resumeText").value.trim();
  const jobDescription = document.getElementById("jobDescription").value.trim();
  const btn = document.getElementById("analyzeBtn");
  const loading = document.getElementById("loading");
  const results = document.getElementById("results");
  const error = document.getElementById("error");

  // Reset
  results.style.display = "none";
  error.style.display = "none";

  // Use file text if uploaded, otherwise use textarea
  const resumeText = extractedResumeText || resumeTextArea;

  // Validate
  if (!resumeText) {
    showError("Please upload a resume file or paste your resume text.");
    return;
  }

  if (!jobDescription) {
    showError("Please paste a job description.");
    return;
  }

  // Show loading
  btn.disabled = true;
  btn.textContent = "Analyzing...";
  loading.style.display = "block";

  try {
    const formData = new FormData();
    formData.append("resume_text", resumeText);
    formData.append("job_description", jobDescription);

    const response = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Something went wrong. Please try again.");
    }

    const data = await response.json();

    // Populate results
    document.getElementById("matchScore").textContent = data.match_score + "%";

    const matchedList = document.getElementById("matchedSkills");
    matchedList.innerHTML = "";
    data.matched_skills.forEach((skill) => {
      const li = document.createElement("li");
      li.textContent = skill;
      matchedList.appendChild(li);
    });

    const missingList = document.getElementById("missingSkills");
    missingList.innerHTML = "";
    data.missing_skills.forEach((skill) => {
      const li = document.createElement("li");
      li.textContent = skill;
      missingList.appendChild(li);
    });

    document.getElementById("strengths").textContent = data.strengths;
    document.getElementById("recommendation").textContent = data.recommendation;

    // Show results
    results.style.display = "block";
    results.scrollIntoView({ behavior: "smooth" });

  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Analyze Match";
    loading.style.display = "none";
  }
}