# GitHub Desktop으로 업로드 및 웹 배포

1. GitHub Desktop에서 `Natural-English` 저장소를 선택합니다.
2. Changes에서 앱 파일을 확인합니다. 개인 교재, 진도 백업, 테스트 결과는 포함하지 않습니다.
3. Summary에 `Add Natural English app and Pages deployment`를 입력하고 **Commit to main**을 누릅니다.
4. **Push origin**을 누릅니다.
5. GitHub 웹에서 저장소의 **Settings → Pages → Build and deployment → Source → GitHub Actions**를 선택합니다.
6. **Actions → Deploy Natural English → Run workflow → main → Run workflow**를 누릅니다. 첫 Push 시 Pages 설정이 아직 없어서 실패했다면 이 단계로 다시 실행하세요.
7. 실행이 초록색 성공으로 바뀌면 **Settings → Pages → Visit site**를 누릅니다.

배포 성공 후 예상 주소: https://ska001-tech.github.io/Natural-English/
이 문서의 주소는 배포 성공 전에는 작동하지 않을 수 있습니다.

GitHub Free의 Pages는 공개 저장소에서 사용 가능합니다. 비공개 저장소라면 저장소 공개 전환 없이 별도 호스팅(Cloudflare Pages 등)을 선택하거나 지원하는 GitHub 요금제가 필요합니다.

배포 대상은 `dist/`뿐입니다. GitHub에는 앱 소스와 표준 샘플이 저장됩니다. 앱으로 Import한 개인 자료와 진도는 기기의 IndexedDB에 있으며 이 배포로 업로드되지 않습니다.

다음 업데이트는 이 GitHub 저장소 폴더에서 수정 → Commit → Push하면 자동 배포됩니다. 코드/CSS/HTML 변경 시 `dist/sw.js`의 CACHE 버전을 올려주세요. 앱 소스 번들은 Actions가 자동 생성합니다.

갤럭시탭/안드로이드 Chrome에서 배포 주소 접속 → 오프라인 준비 확인 → 홈 화면에 추가 → 설치. PC의 기존 교재는 Settings에서 백업하여 웹 앱에서 복원합니다. 기기 간 자동 동기화는 없습니다.
