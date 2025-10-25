
import React from 'react';
import { Node } from '../types';

interface BreadcrumbsProps {
  path: Node[];
  onNodeClick: (nodeId: string) => void;
}

export default function Breadcrumbs({ path, onNodeClick }: BreadcrumbsProps) {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol role="list" className="flex items-center space-x-2">
        {path.map((node, index) => (
          <li key={node.id}>
            <div className="flex items-center">
              {index > 0 && (
                <svg
                  className="flex-shrink-0 h-5 w-5 text-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <a
                onClick={() => onNodeClick(node.id)}
                className={`ml-2 text-sm font-medium  ${index === path.length - 1 ? 'text-gray-200' : 'text-gray-400 hover:text-gray-200 cursor-pointer'}`}
                aria-current={index === path.length - 1 ? 'page' : undefined}
              >
                {node.title}
              </a>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
