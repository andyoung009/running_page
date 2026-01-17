@echo off
chcp 65001 >nul
echo ========================================
echo 开始执行运行脚本
echo ========================================
echo.

echo [1/7] 激活 Conda 环境 env_isaaclab...
call conda activate env_isaaclab
if %errorlevel% neq 0 (
    echo 错误：无法激活 Conda 环境！
    pause
    exit /b 1
)
echo ✓ 环境激活成功
echo.

echo [2/7] 生成第一个 circular SVG...
python run_page/gen_svg.py --from-db --type circular --use-localtime
if %errorlevel% neq 0 (
    echo 警告：命令执行失败！
)
echo.

echo [3/7] 生成 GitHub SVG...
python run_page/gen_svg.py --from-db --title "Five" --type github --athlete "Five" --special-distance 3 --special-distance2 5 --special-color yellow --special-color2 red --output assets/github.svg --use-localtime --min-distance 0.5
if %errorlevel% neq 0 (
    echo 警告：命令执行失败！
)
echo.

echo [4/7] 生成 Grid SVG...
python run_page/gen_svg.py --from-db --title "Five" --type grid --athlete "Five" --output assets/grid.svg --min-distance 2.0 --special-color yellow --special-color2 red --special-distance 20 --special-distance2 5 --use-localtime
if %errorlevel% neq 0 (
    echo 警告：命令执行失败！
)
echo.

echo [5/7] 生成第二个 circular SVG...
python run_page/gen_svg.py --from-db --type circular --use-localtime
if %errorlevel% neq 0 (
    echo 警告：命令执行失败！
)
echo.

echo [6/7] 生成 Month of Life SVG...
python run_page/gen_svg.py --from-db --type monthoflife --birth 1992-06 --special-distance 5 --special-distance2 10 --special-color "#f9d367" --special-color2 "#f0a1a8" --output assets/mol.svg --use-localtime --athlete Five --title "Runner Month of Life"
if %errorlevel% neq 0 (
    echo 警告：命令执行失败！
)
echo.

echo [7/7] 运行 Yarn develop...
yarn develop
if %errorlevel% neq 0 (
    echo 警告：Yarn 命令执行失败！
)
echo.

echo ========================================
echo 所有任务执行完毕！
echo ========================================
pause
