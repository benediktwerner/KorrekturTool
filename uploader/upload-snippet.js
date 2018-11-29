(() => {
  const grades = XXXXX;

  for (const userRow of document.getElementsByClassName('unselectedrow')) {
    const userName = userRow.getElementsByClassName('c2')[0].children[0].text;
    const names = userName.split(' ');

    let user = grades[names[names.length - 1] + ' ' + names.slice(0, names.length - 1).join(' ')];
    if (!user) {
      user = grades[names.slice(1).join(' ') + ' ' + names[0]];

      if (!user) {
        console.log(`No grade for ${userName}`);
        continue;
      }
    }

    user.name = userName;
    user.moodleUserId = userRow.classList[0].replace('user', '');
  }

  for (const { name, moodleUserId, grade, feedback } of Object.values(grades)) {
    const userRow = document.getElementsByClassName(`user${moodleUserId}`)[0];

    if (!userRow) {
      console.log(`No row for user ${name}`);
      continue;
    }

    const setColor = color => {
      [...Array(16).keys()].forEach(i => (userRow.childNodes[i].style.backgroundColor = color));
    };

    if (userRow.childNodes[5].textContent.includes('Bewertet')) {
      console.log(`Skipping ${name} - already graded`);
      continue;
    }

    document.getElementById(`quickgrade_${moodleUserId}`).value = grade;
    document.getElementById(`quickgrade_comments_${moodleUserId}`).value = feedback;
    console.log('User ' + name);
    setColor('LightGreen');
  }
})();
