(() => {
  const grades = XXXXX;

  for (const userRow of document.getElementsByClassName("unselectedrow")) {
    const user = grades[userRow.getElementsByClassName("c2")[0].children[0].text];
    if (!user) {
      console.log(`No grade for ${user}`);
      continue;
    }

    user.moodleUserId = userRow.classList[0];
  }

  for (const [name, { moodleUserId, grade, feedback }] of Object.entries(grades)) {
    const userRow = document.getElementsByClassName(`user${moodleUserId}`)[0];
    const setColor = color => {
      [...Array(17).keys()].forEach(i => (userRow.childNodes[i].style.backgroundColor = color));
    };

    if (userRow.childNodes[5].textContent.includes("Bewertet")) {
      console.log(`Skipping ${name} - already graded`);
      continue;
    }

    document.getElementById(`quickgrade_${moodleUserId}`).value = grade;
    document.getElementById(`quickgrade_comments_${moodleUserId}`).value = feedback;
    setColor("LightGreen");
  }
})();
