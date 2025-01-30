import { Div3D, Hover3D } from "@dust-tt/sparkle";
import React from "react";

import { ImgBlock } from "@app/components/home/ContentBlocks";
import { classNames } from "@app/lib/utils";

import { H2 } from "../../ContentComponents";

export function ValuePropSection() {
  return (
    <div className="w-full">
      <div className="mb-6">
        <H2 from="from-amber-200" to="to-amber-400">
          Amplify your team's performance with new capabilities
        </H2>
        {/* <P size="lg">
          Anyone on your&nbsp;team can create personalized&nbsp;assistants.
        </P> */}
      </div>

      <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 md:gap-24">
        <ImgBlock
          title={<>Answer any question, instantly</>}
          content={
            <>
              Dust searches and synthesizes info from all your tools. Enjoy
              summarization, targeted extractions, and crisp insights from
              relevant docs.
            </>
          }
        >
          <Hover3D
            depth={-20}
            perspective={1000}
            className={classNames("relative")}
          >
            <Div3D depth={-40}>
              <img src="/static/landing/docexpert/docexpert1.png" />
            </Div3D>
            <Div3D depth={0} className="absolute top-0">
              <img src="/static/landing/docexpert/docexpert2.png" />
            </Div3D>
          </Hover3D>
        </ImgBlock>
        <ImgBlock
          title={<>Unlock any skills</>}
          content={
            <>
              Go from marketer to coder in one step, Dust AI agents cover skill
              gaps so you can focus on vision. Your imagination is the only
              limit.
            </>
          }
        >
          <Hover3D
            depth={-20}
            perspective={1000}
            className={classNames("relative")}
          >
            <Div3D depth={-40}>
              <img src="/static/landing/code/code1.png" />
            </Div3D>
            <Div3D depth={0} className="absolute top-0">
              <img src="/static/landing/code/code2.png" />
            </Div3D>
          </Hover3D>
        </ImgBlock>
        <ImgBlock
          title={<>Analyse anything</>}
          content={
            <>
              From spreadsheets to data warehouses, Dust analyzes and visualize
              any datasets to reveal patterns and speed up decisions.
            </>
          }
        >
          <Hover3D
            depth={-20}
            perspective={1000}
            className={classNames("relative")}
          >
            <Div3D depth={-40}>
              <img src="/static/landing/analysis/analysis1.png" />
            </Div3D>
            <Div3D depth={0} className="absolute top-0">
              <img src="/static/landing/analysis/analysis2.png" />
            </Div3D>
            <Div3D depth={15} className="absolute top-0">
              <img src="/static/landing/analysis/analysis3.png" />
            </Div3D>
          </Hover3D>
        </ImgBlock>
        <ImgBlock
          title={<>Automate work beyond limits</>}
          content={
            <>
              From data entry to CRM updates, let AI agents handle repetitive
              tasks so you can focus on driving impact.
            </>
          }
        >
          <Hover3D
            depth={-20}
            perspective={1000}
            className={classNames("relative")}
          >
            <Div3D depth={-40}>
              <img src="/static/landing/crm/crm1.png" />
            </Div3D>
            <Div3D depth={0} className="absolute top-0">
              <img src="/static/landing/crm/crm2.png" />
            </Div3D>
          </Hover3D>
        </ImgBlock>
      </div>
    </div>
  );
}
