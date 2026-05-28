import { useState } from "react";
import { Link } from "react-router";
import { ChevronDownIcon, FolderIcon, GroupIcon, GridIcon, DocsIcon } from "../icons";
import { useSidebar } from "../context/SidebarContext";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  subItems?: { name: string; path: string }[];
};

const navItems: NavItem[] = [
  {
    icon: <FolderIcon />,
    name: "데이터 관리",
    subItems: [
      { name: "데이터 업로드", path: "/data/upload" },
      { name: "히스토리", path: "/data/history" },
    ],
  },
  {
    icon: <GroupIcon />,
    name: "기업체·병원별 마케팅 현황",
    subItems: [
      { name: "기업체별 마케팅 현황", path: "/marketing/company" },
      { name: "병원별 예약 현황", path: "/marketing/hospital" },
    ],
  },
  {
    icon: <GridIcon />,
    name: "디스플레이 광고 현황",
    subItems: [
      { name: "PV/UV 전체 현황", path: "/display/pv-uv" },
      { name: "로그인 회원 PV", path: "/display/member-pv" },
      { name: "전국 지역별 PV", path: "/display/regional-pv" },
      { name: "연령대 기준 클릭률", path: "/display/age-ctr" },
    ],
  },
  {
    icon: <DocsIcon />,
    name: "유전자 검사 콘텐츠 현황",
    subItems: [],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const isVisible = isExpanded || isHovered || isMobileOpen;

  const toggleMenu = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/">
          {isVisible ? (
            <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
              한컴케어링크 Report
            </span>
          ) : (
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              한컴
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto no-scrollbar">
        <ul className="flex flex-col gap-1">
          {navItems.map((item, index) => (
            <li key={item.name}>
              <button
                onClick={() => toggleMenu(index)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
                  text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800
                  ${!isVisible ? "lg:justify-center" : ""}`}
              >
                <span className="shrink-0 w-5 h-5 text-gray-500 dark:text-gray-400">
                  {item.icon}
                </span>

                {isVisible && (
                  <>
                    <span className="flex-1 text-sm font-medium leading-snug text-left">
                      {item.name}
                    </span>
                    {item.subItems && item.subItems.length > 0 && (
                      <ChevronDownIcon
                        className={`shrink-0 w-4 h-4 text-gray-400 transition-transform duration-200 ${
                          openIndex === index ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </>
                )}
              </button>

              {/* Sub-items placeholder (collapsed by default, ready for future items) */}
              {isVisible && item.subItems && item.subItems.length > 0 && (
                <ul
                  className={`overflow-hidden transition-all duration-200 ml-8 mt-1 space-y-1 ${
                    openIndex === index ? "max-h-96" : "max-h-0"
                  }`}
                >
                  {item.subItems.map((sub) => (
                    <li key={sub.name}>
                      <Link
                        to={sub.path}
                        className="block px-3 py-2 text-sm text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default AppSidebar;
